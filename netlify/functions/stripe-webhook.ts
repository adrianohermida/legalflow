import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = event.body;
    const signature = event.headers['stripe-signature'];

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    // Parse the event
    let stripeEvent;
    try {
      stripeEvent = JSON.parse(body);
    } catch (err) {
      console.error('Invalid JSON:', err);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON' })
      };
    }

    console.log(`Received Stripe event: ${stripeEvent.type} (${stripeEvent.id})`);

    // Check if event is already processed (idempotency)
    const { data: shouldProcess } = await supabase
      .rpc('stripe_record_event', { p_event: stripeEvent });

    if (!shouldProcess) {
      console.log(`Event ${stripeEvent.id} already processed, skipping`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ received: true, processed: false, reason: 'already_processed' })
      };
    }

    // Process the event based on type
    let processed = false;
    let error = null;

    try {
      switch (stripeEvent.type) {
        case 'customer.created':
        case 'customer.updated':
          await supabase.rpc('stripe_upsert_customer', { p: stripeEvent.data.object });
          processed = true;
          break;

        case 'product.created':
        case 'product.updated':
          await supabase.rpc('stripe_upsert_product', { p: stripeEvent.data.object });
          processed = true;
          break;

        case 'price.created':
        case 'price.updated':
          await supabase.rpc('stripe_upsert_price', { p: stripeEvent.data.object });
          processed = true;
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await supabase.rpc('stripe_upsert_subscription', { p: stripeEvent.data.object });
          processed = true;
          break;

        case 'invoice.created':
        case 'invoice.updated':
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
        case 'invoice.finalized':
          await supabase.rpc('stripe_upsert_invoice', { p: stripeEvent.data.object });
          processed = true;
          break;

        case 'payment_intent.created':
        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
        case 'payment_intent.canceled':
          await supabase.rpc('stripe_upsert_payment_intent', { p: stripeEvent.data.object });
          processed = true;
          break;

        case 'checkout.session.completed':
        case 'checkout.session.expired':
          await supabase.rpc('stripe_upsert_checkout_session', { p: stripeEvent.data.object });
          processed = true;
          break;

        // Handle subscription item events
        case 'customer.subscription.trial_will_end':
          console.log(`Trial ending for subscription: ${stripeEvent.data.object.id}`);
          // Could trigger notifications here
          processed = true;
          break;

        case 'invoice.upcoming':
          console.log(`Upcoming invoice for customer: ${stripeEvent.data.object.customer}`);
          // Could trigger notifications here
          processed = true;
          break;

        default:
          console.log(`Unhandled event type: ${stripeEvent.type}`);
          processed = true; // Mark as processed to avoid reprocessing
          break;
      }

      // Special handling for subscription lifecycle events
      if (stripeEvent.type.startsWith('customer.subscription.')) {
        await handleSubscriptionLifecycle(stripeEvent);
      }

      // Special handling for payment events
      if (stripeEvent.type.startsWith('payment_intent.') || stripeEvent.type.startsWith('invoice.payment_')) {
        await handlePaymentLifecycle(stripeEvent);
      }

    } catch (processingError) {
      console.error('Error processing webhook:', processingError);
      error = processingError instanceof Error ? processingError.message : 'Unknown processing error';
      processed = false;
    }

    // Mark event as processed in the database
    await supabase.rpc('stripe_mark_event_processed', {
      p_event_id: stripeEvent.id,
      p_ok: processed,
      p_error: error
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        processed,
        event_type: stripeEvent.type,
        event_id: stripeEvent.id,
        error
      })
    };

  } catch (error) {
    console.error('Webhook handler error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        received: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      })
    };
  }
};

// Helper function to handle subscription lifecycle events
async function handleSubscriptionLifecycle(stripeEvent: any) {
  const subscription = stripeEvent.data.object;
  
  try {
    // Update any related deals based on subscription status
    if (subscription.status === 'active') {
      // Move related deals to "won" stage if subscription becomes active
      await supabase
        .schema('legalflow')
        .from('deals')
        .update({
          stage_id: (
            await supabase
              .schema('legalflow')
              .from('pipeline_stages')
              .select('id')
              .eq('pipeline_id', (await supabase
                .schema('legalflow')
                .from('pipeline_defs')
                .select('id')
                .eq('code', 'sales')
                .single()).data?.id)
              .eq('is_won', true)
              .single()
          ).data?.id
        })
        .eq('properties->stripe_subscription_id', subscription.id);
    } else if (['canceled', 'past_due', 'unpaid'].includes(subscription.status)) {
      // Move related deals to "lost" stage if subscription fails
      await supabase
        .from('legalflow.deals')
        .update({
          stage_id: (
            await supabase
              .from('legalflow.pipeline_stages')
              .select('id')
              .eq('pipeline_id', (await supabase
                .from('legalflow.pipeline_defs')
                .select('id')
                .eq('code', 'sales')
                .single()).data?.id)
              .eq('is_lost', true)
              .single()
          ).data?.id
        })
        .eq('properties->stripe_subscription_id', subscription.id);
    }

    console.log(`Subscription lifecycle handled: ${subscription.id} -> ${subscription.status}`);
  } catch (error) {
    console.error('Error handling subscription lifecycle:', error);
  }
}

// Helper function to handle payment lifecycle events
async function handlePaymentLifecycle(stripeEvent: any) {
  const eventData = stripeEvent.data.object;
  
  try {
    // Handle successful payments
    if (stripeEvent.type === 'payment_intent.succeeded' || stripeEvent.type === 'invoice.payment_succeeded') {
      const customerId = eventData.customer;
      
      if (customerId) {
        // Update customer properties with last payment info
        await supabase
          .from('legalflow.stripe_customers')
          .update({
            data: supabase.raw(`
              data || jsonb_build_object(
                'last_payment_date', '${new Date().toISOString()}',
                'last_payment_amount', ${eventData.amount || eventData.amount_paid || 0},
                'payment_status', 'succeeded'
              )
            `)
          })
          .eq('id', customerId);

        // If this is related to a case (legal pipeline), update the case status
        if (eventData.metadata?.numero_cnj) {
          await supabase
            .from('legalflow.case_pipeline_links')
            .update({
              stage_id: (
                await supabase
                  .from('legalflow.pipeline_stages')
                  .select('id')
                  .eq('pipeline_id', (await supabase
                    .from('legalflow.pipeline_defs')
                    .select('id')
                    .eq('code', 'finance')
                    .single()).data?.id)
                  .eq('code', 'pago')
                  .single()
              ).data?.id
            })
            .eq('numero_cnj', eventData.metadata.numero_cnj);
        }
      }
    }

    // Handle failed payments
    if (stripeEvent.type === 'payment_intent.payment_failed' || stripeEvent.type === 'invoice.payment_failed') {
      const customerId = eventData.customer;
      
      if (customerId) {
        // Update customer properties with failed payment info
        await supabase
          .from('legalflow.stripe_customers')
          .update({
            data: supabase.raw(`
              data || jsonb_build_object(
                'last_payment_attempt', '${new Date().toISOString()}',
                'payment_status', 'failed',
                'failed_attempts', COALESCE((data->>'failed_attempts')::integer, 0) + 1
              )
            `)
          })
          .eq('id', customerId);

        // If this is related to a case, update to collection stage
        if (eventData.metadata?.numero_cnj) {
          await supabase
            .from('legalflow.case_pipeline_links')
            .update({
              stage_id: (
                await supabase
                  .from('legalflow.pipeline_stages')
                  .select('id')
                  .eq('pipeline_id', (await supabase
                    .from('legalflow.pipeline_defs')
                    .select('id')
                    .eq('code', 'finance')
                    .single()).data?.id)
                  .eq('code', 'cobranca')
                  .single()
              ).data?.id
            })
            .eq('numero_cnj', eventData.metadata.numero_cnj);
        }
      }
    }

    console.log(`Payment lifecycle handled: ${stripeEvent.type} for ${eventData.id}`);
  } catch (error) {
    console.error('Error handling payment lifecycle:', error);
  }
}
