export const run: ActionRun = async ({ logger, api, params }) => {
  const { email } = params as { email: string };

  if (!email) {
    throw new Error("Email parameter is required");
  }

  logger.info({ email }, "Looking up customer in Shopify (direct API)");

  // Load Shopify credentials from appConfiguration
  const config = await api.appConfiguration.findFirst({
    select: { shopifyStoreDomain: true, shopifyAccessToken: true } as any,
  });

  const storeDomain = (config as any)?.shopifyStoreDomain;
  const accessToken = (config as any)?.shopifyAccessToken;

  if (!storeDomain || !accessToken) {
    logger.warn("Shopify credentials not configured");
    return {
      found: false,
      customer: null,
      orders: [],
      error: "Shopify not configured - add credentials to appConfiguration",
    };
  }

  try {
    // Search for customer by email
    const searchUrl = `https://${storeDomain}/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(email)}`;
    
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const customers = data.customers || [];

    if (customers.length === 0) {
      logger.info({ email }, "Customer not found in Shopify");
      return {
        found: false,
        customer: null,
        orders: [],
      };
    }

    // Take first matching customer
    const customer = customers[0];
    const customerId = customer.id;

    logger.info({ email, customerId }, "Customer found in Shopify");

    // Fetch customer's orders
    const ordersUrl = `https://${storeDomain}/admin/api/2024-01/customers/${customerId}/orders.json?status=any&limit=10`;
    
    const ordersResponse = await fetch(ordersUrl, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!ordersResponse.ok) {
      logger.warn({ customerId }, "Failed to fetch orders");
      return {
        found: true,
        customer: {
          id: customerId,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          ordersCount: customer.orders_count || 0,
          totalSpent: customer.total_spent || "0.00",
        },
        orders: [],
      };
    }

    const ordersData = await ordersResponse.json();
    const orders = (ordersData.orders || []).map((order: any) => ({
      id: order.id,
      orderNumber: order.name, // e.g., "#1001"
      createdAt: order.created_at,
      totalPrice: order.total_price,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      lineItemsCount: order.line_items?.length || 0,
    }));

    logger.info({ email, customerId, orderCount: orders.length }, "Customer and orders retrieved");

    return {
      found: true,
      customer: {
        id: customerId,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        ordersCount: customer.orders_count || 0,
        totalSpent: customer.total_spent || "0.00",
      },
      orders,
    };

  } catch (error: any) {
    logger.error({ email, error: error.message }, "Shopify lookup failed");
    return {
      found: false,
      customer: null,
      orders: [],
      error: error.message,
    };
  }
};

export const params = {
  email: { type: "string" },
};

export const options = {
  triggers: { api: true },
};
