import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get Stripe configuration
async function getStripeConfig() {
  const { data, error } = await supabase
    .from('api_credentials')
    .select('secret_key, mode, active')
    .eq('provider', 'stripe')
    .eq('active', true)
    .single();

  if (error || !data) {
    throw new Error('Stripe não configurado ou inativo');
  }

  return data;
}

// Make Stripe API request
async function stripeRequest(endpoint: string, options: RequestInit = {}) {
  const config = await getStripeConfig();
  
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.secret_key}`,
      'Stripe-Version': '2023-10-16',
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Stripe API error: ${response.status}`);
  }

  return response.json();
}

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  const path = event.path.replace('/api/stripe/', '');
  const method = event.httpMethod;

  try {
    // Route requests
    switch (`${method}:${path}`) {
      case 'POST:search-customers':
        return await searchCustomers(event, headers);
      
      case 'POST:sync-customers':
        return await syncCustomers(event, headers);
      
      case 'POST:sync-all':
        return await syncAllData(event, headers);
      
      case 'POST:create-checkout-session':
        return await createCheckoutSession(event, headers);
      
      case 'POST:create-subscription':
        return await createSubscription(event, headers);
      
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Endpoint not found' })
        };
    }
  } catch (error) {
    console.error('Stripe utils error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      })
    };
  }
};

// Search customers in Stripe
async function searchCustomers(event: any, headers: any) {
  const { query } = JSON.parse(event.body || '{}');
  
  if (!query || query.length < 2) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Query deve ter pelo menos 2 caracteres'
      })
    };
  }

  try {
    // Search by email
    const emailSearch = await stripeRequest(`/customers?email=${encodeURIComponent(query)}&limit=10`);
    
    // Search by general query if no email results
    let generalSearch = { data: [] };
    if (emailSearch.data.length === 0) {
      generalSearch = await stripeRequest(`/customers/search?query=${encodeURIComponent(`name:'${query}' OR email:'${query}'`)}&limit=10`);
    }

    const customers = [...emailSearch.data, ...generalSearch.data]
      .filter((customer, index, self) => self.findIndex(c => c.id === customer.id) === index)
      .map(customer => ({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        created: customer.created
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customers
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Falha na busca'
      })
    };
  }
}

// Sync customers from Stripe
async function syncCustomers(event: any, headers: any) {
  try {
    let hasMore = true;
    let startingAfter = null;
    let totalSynced = 0;

    while (hasMore && totalSynced < 100) { // Limit to 100 customers per sync
      const params = new URLSearchParams({
        limit: '10',
        ...(startingAfter && { starting_after: startingAfter })
      });

      const response = await stripeRequest(`/customers?${params}`);
      
      for (const customer of response.data) {
        await supabase.rpc('stripe_upsert_customer', { p: customer });
        totalSynced++;
      }

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: totalSynced
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Falha na sincronização'
      })
    };
  }
}

// Sync all Stripe data
async function syncAllData(event: any, headers: any) {
  try {
    let totalSynced = 0;

    // Sync products
    const products = await stripeRequest('/products?limit=100&active=true');
    for (const product of products.data) {
      await supabase.rpc('stripe_upsert_product', { p: product });
      totalSynced++;
    }

    // Sync prices
    const prices = await stripeRequest('/prices?limit=100&active=true');
    for (const price of prices.data) {
      await supabase.rpc('stripe_upsert_price', { p: price });
      totalSynced++;
    }

    // Sync recent customers (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const customers = await stripeRequest(`/customers?limit=50&created[gte]=${thirtyDaysAgo}`);
    for (const customer of customers.data) {
      await supabase.rpc('stripe_upsert_customer', { p: customer });
      totalSynced++;
    }

    // Sync recent subscriptions
    const subscriptions = await stripeRequest(`/subscriptions?limit=50&created[gte]=${thirtyDaysAgo}`);
    for (const subscription of subscriptions.data) {
      await supabase.rpc('stripe_upsert_subscription', { p: subscription });
      totalSynced++;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total_synced: totalSynced
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Falha na sincronização completa'
      })
    };
  }
}

// Create checkout session
async function createCheckoutSession(event: any, headers: any) {
  const { 
    contact_id, 
    price_id, 
    quantity = 1, 
    success_url, 
    cancel_url,
    metadata = {},
    mode = 'subscription'
  } = JSON.parse(event.body || '{}');

  if (!contact_id || !price_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'contact_id e price_id são obrigatórios'
      })
    };
  }

  try {
    // Get contact info
    const { data: contact } = await supabase
      .schema('legalflow')
      .from('contacts')
      .select('*')
      .eq('id', contact_id)
      .single();

    if (!contact) {
      throw new Error('Contato não encontrado');
    }

    // Get or create Stripe customer
    let stripe_customer_id = contact.stripe_customer_id;
    
    if (!stripe_customer_id) {
      const customer = await stripeRequest('/customers', {
        method: 'POST',
        body: new URLSearchParams({
          email: contact.email || '',
          name: contact.name || '',
          phone: contact.phone || '',
          metadata: JSON.stringify({ contact_id })
        })
      });
      
      stripe_customer_id = customer.id;
      
      // Update contact with Stripe customer ID
      await supabase
        .from('legalflow.contacts')
        .update({ stripe_customer_id })
        .eq('id', contact_id);
      
      // Save customer to Stripe mirror
      await supabase.rpc('stripe_upsert_customer', { p: customer });
    }

    // Create checkout session
    const sessionParams = new URLSearchParams({
      'payment_method_types[]': 'card',
      mode,
      customer: stripe_customer_id,
      success_url: success_url || `${event.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${event.headers.origin}/cancel`,
      'line_items[0][price]': price_id,
      'line_items[0][quantity]': quantity.toString(),
      ...Object.entries(metadata).reduce((acc, [key, value]) => {
        acc[`metadata[${key}]`] = value;
        return acc;
      }, {} as Record<string, string>)
    });

    const session = await stripeRequest('/checkout/sessions', {
      method: 'POST',
      body: sessionParams
    });

    // Save session to database
    await supabase.rpc('stripe_upsert_checkout_session', { p: session });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session_id: session.id,
        url: session.url
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Falha ao criar checkout session'
      })
    };
  }
}

// Create subscription
async function createSubscription(event: any, headers: any) {
  const { customer_id, price_id, quantity = 1, trial_days = 0 } = JSON.parse(event.body || '{}');

  if (!customer_id || !price_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'customer_id e price_id são obrigatórios'
      })
    };
  }

  try {
    const subscriptionParams = new URLSearchParams({
      customer: customer_id,
      'items[0][price]': price_id,
      'items[0][quantity]': quantity.toString(),
      ...(trial_days > 0 && { trial_period_days: trial_days.toString() })
    });

    const subscription = await stripeRequest('/subscriptions', {
      method: 'POST',
      body: subscriptionParams
    });

    // Save subscription to database
    await supabase.rpc('stripe_upsert_subscription', { p: subscription });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        subscription_id: subscription.id,
        status: subscription.status
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Falha ao criar assinatura'
      })
    };
  }
}
