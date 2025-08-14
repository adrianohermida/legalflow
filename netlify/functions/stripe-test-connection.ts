import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { secret_key, mode } = JSON.parse(event.body || "{}");

    if (!secret_key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: "Secret key é obrigatória",
        }),
      };
    }

    // Validate key format
    const expectedPrefix = mode === "live" ? "sk_live_" : "sk_test_";
    if (!secret_key.startsWith(expectedPrefix)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Chave deve começar com ${expectedPrefix} para modo ${mode}`,
        }),
      };
    }

    // Test Stripe API connection
    const stripeResponse = await fetch("https://api.stripe.com/v1/account", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret_key}`,
        "Stripe-Version": "2023-10-16",
      },
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: errorData.error?.message || "Falha na autenticação com Stripe",
        }),
      };
    }

    const accountData = await stripeResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        account: {
          id: accountData.id,
          email: accountData.email,
          country: accountData.country,
          currency: accountData.default_currency,
          details_submitted: accountData.details_submitted,
          charges_enabled: accountData.charges_enabled,
          payouts_enabled: accountData.payouts_enabled,
        },
      }),
    };
  } catch (error) {
    console.error("Stripe test connection error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Erro interno do servidor",
      }),
    };
  }
};
