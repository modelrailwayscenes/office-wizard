/**
 * Shared seed template data for seedCustomerTemplates action and seed route.
 */
export const SEED_TEMPLATES = [
  {
    name: "Order status - dispatched",
    category: "tracking_request" as const,
    subject: "Your order {orderNumber} has been dispatched",
    body: `Dear {customerName},

Great news! Your order {orderNumber} has been dispatched and is on its way.

You can track your delivery using the link below. Please allow 24-48 hours for tracking information to become active.

If you have any questions, please don't hesitate to get in touch.

Best regards,
{company_name}`,
    safetyLevel: "safe" as const,
    description: "Sent when order is dispatched with tracking",
  },
  {
    name: "Order status - processing",
    category: "tracking_request" as const,
    subject: "Order {orderNumber} - we're preparing your items",
    body: `Dear {customerName},

Thank you for your order {orderNumber}. We're currently preparing your items for dispatch.

We'll send you another email with tracking details as soon as your order is on its way. Our standard delivery is 3-5 business days.

Best regards,
{company_name}`,
    safetyLevel: "safe" as const,
  },
  {
    name: "Tracking number provided",
    category: "tracking_request" as const,
    subject: "Tracking for order {orderNumber}",
    body: `Dear {customerName},

Your order {orderNumber} is on its way. Tracking number: {trackingNumber}

You can track your parcel here: {trackingUrl}

Expected delivery: 3-5 business days from dispatch.

Best regards,
{company_name}`,
    safetyLevel: "safe" as const,
  },
  {
    name: "Shipping delay - general",
    category: "delivery_info" as const,
    subject: "Update on your order {orderNumber}",
    body: `Dear {customerName},

We're writing to let you know there has been a slight delay with your order {orderNumber}.

We're doing everything we can to get your order to you as soon as possible. We'll send you tracking information as soon as it's dispatched.

We apologise for any inconvenience and thank you for your patience.

Best regards,
{company_name}`,
    safetyLevel: "safe" as const,
  },
  {
    name: "General enquiry - thank you",
    category: "general_faq" as const,
    subject: "We've received your message",
    body: `Dear {customerName},

Thank you for getting in touch. We've received your message and a member of our team will respond within 1-2 business days.

If your query is urgent, please include "Urgent" in the subject line.

Best regards,
{company_name}`,
    safetyLevel: "safe" as const,
  },
  {
    name: "Refund request - acknowledged",
    category: "refund_policy" as const,
    subject: "We've received your refund request - Order {orderNumber}",
    body: `Dear {customerName},

Thank you for contacting us. We've received your refund request for order {orderNumber}.

Our team will review your request and respond within 2-3 business days.

Best regards,
{company_name}`,
    safetyLevel: "moderate" as const,
  },
  {
    name: "Order cancellation - confirmed",
    category: "custom" as const,
    subject: "Order {orderNumber} cancelled",
    body: `Dear {customerName},

We've cancelled your order {orderNumber} as requested.

If payment was taken, a full refund will be processed within 5-10 business days.

Best regards,
{company_name}`,
    safetyLevel: "safe" as const,
  },
];

export function extractVariables(text: string): string[] {
  const regex = /\{([a-zA-Z0-9_]+)\}/g;
  const matches = [...text.matchAll(regex)];
  return [...new Set(matches.map((m) => m[1]))];
}
