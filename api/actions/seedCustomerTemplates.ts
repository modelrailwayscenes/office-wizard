import type { ActionOptions } from "gadget-server";

/**
 * seedCustomerTemplates
 *
 * Seeds 25–50 structured customer templates for Model Railway Scenes.
 * Categories map to schema: tracking_request, delivery_info, refund_policy,
 * request_more_info, general_faq, custom.
 *
 * Placeholders use {variableName} syntax. Run once to populate; skips existing names.
 */

const SEED_TEMPLATES: Array<{
  name: string;
  category: "tracking_request" | "delivery_info" | "refund_policy" | "request_more_info" | "general_faq" | "custom";
  subject: string;
  body: string;
  safetyLevel: "safe" | "moderate" | "risky";
  description?: string;
}> = [
  // ── Order status / tracking_request ─────────────────────────────────────
  {
    name: "Order status - dispatched",
    category: "tracking_request",
    subject: "Your order {orderNumber} has been dispatched",
    body: `Dear {customerName},

Great news! Your order {orderNumber} has been dispatched and is on its way.

You can track your delivery using the link below. Please allow 24-48 hours for tracking information to become active.

If you have any questions, please don't hesitate to get in touch.

Best regards,
{company_name}`,
    safetyLevel: "safe",
    description: "Sent when order is dispatched with tracking",
  },
  {
    name: "Order status - processing",
    category: "tracking_request",
    subject: "Order {orderNumber} - we're preparing your items",
    body: `Dear {customerName},

Thank you for your order {orderNumber}. We're currently preparing your items for dispatch.

We'll send you another email with tracking details as soon as your order is on its way. Our standard delivery is 3-5 business days.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  {
    name: "Tracking number provided",
    category: "tracking_request",
    subject: "Tracking for order {orderNumber}",
    body: `Dear {customerName},

Your order {orderNumber} is on its way. Tracking number: {trackingNumber}

You can track your parcel here: {trackingUrl}

Expected delivery: 3-5 business days from dispatch.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  // ── Shipping delay / delivery_info ──────────────────────────────────────
  {
    name: "Shipping delay - general",
    category: "delivery_info",
    subject: "Update on your order {orderNumber}",
    body: `Dear {customerName},

We're writing to let you know there has been a slight delay with your order {orderNumber}.

We're doing everything we can to get your order to you as soon as possible. We'll send you tracking information as soon as it's dispatched.

We apologise for any inconvenience and thank you for your patience.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  {
    name: "Shipping delay - carrier issue",
    category: "delivery_info",
    subject: "Delivery update for order {orderNumber}",
    body: `Dear {customerName},

We've been informed of a delay with the carrier handling your order {orderNumber}. This is outside our control, but we're monitoring the situation closely.

Your order is still on its way and we'll keep you updated. If you have any concerns, please reply to this email.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  {
    name: "Delivery info - standard",
    category: "delivery_info",
    subject: "Delivery information for your order",
    body: `Dear {customerName},

Standard delivery for UK orders is 3-5 business days. We'll email you when your order {orderNumber} has been dispatched with tracking details.

For international orders, delivery typically takes 7-14 business days depending on destination.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  // ── Refund request / refund_policy ───────────────────────────────────────
  {
    name: "Refund request - acknowledged",
    category: "refund_policy",
    subject: "We've received your refund request - Order {orderNumber}",
    body: `Dear {customerName},

Thank you for contacting us. We've received your refund request for order {orderNumber}.

Our team will review your request and respond within 2-3 business days. We may need to ask a few questions to process this correctly.

If you have any supporting information (photos, etc.), please reply to this email.

Best regards,
{company_name}`,
    safetyLevel: "moderate",
  },
  {
    name: "Refund - approved",
    category: "refund_policy",
    subject: "Refund approved for order {orderNumber}",
    body: `Dear {customerName},

We're pleased to confirm that your refund for order {orderNumber} has been approved.

The refund will be processed to your original payment method within 5-10 business days. You may receive the funds sooner depending on your bank.

Thank you for shopping with us.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  {
    name: "Refund policy - general",
    category: "refund_policy",
    subject: "Our refund policy",
    body: `Dear {customerName},

We offer a 30-day refund policy for unused items in their original packaging. To request a refund, please reply with your order number and reason.

Refunds are processed within 5-10 business days of approval. For items that don't meet our policy, we'll explain the reason and suggest alternatives where possible.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  // ── Returns / custom ─────────────────────────────────────────────────────
  {
    name: "Returns - how to return",
    category: "custom",
    subject: "How to return your order {orderNumber}",
    body: `Dear {customerName},

To return items from order {orderNumber}, please:

1. Pack the items securely in their original packaging if possible
2. Include your order number and reason for return
3. Send to the address we'll provide in our next email

We'll send you a returns label and full instructions once we've processed your return request. Refunds are issued within 5-10 business days of receiving the items.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  {
    name: "Return - received",
    category: "custom",
    subject: "We've received your return - Order {orderNumber}",
    body: `Dear {customerName},

We've received your returned items from order {orderNumber}.

Your refund will be processed within 5-10 business days. You'll receive an email confirmation once it's complete.

Thank you for your patience.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  // ── Damaged item / custom ───────────────────────────────────────────────
  {
    name: "Damaged item - replacement offered",
    category: "custom",
    subject: "Replacement for order {orderNumber}",
    body: `Dear {customerName},

We're sorry to hear that items from your order {orderNumber} arrived damaged.

We'd like to send you a replacement at no extra cost. Please confirm your delivery address and we'll dispatch it as soon as possible.

If you'd prefer a refund instead, please let us know.

Best regards,
{company_name}`,
    safetyLevel: "moderate",
  },
  {
    name: "Damaged item - photo requested",
    category: "custom",
    subject: "Help us resolve your issue - Order {orderNumber}",
    body: `Dear {customerName},

We're sorry to hear about the issue with your order {orderNumber}.

To help us process your claim quickly, could you please send photos of the damaged item and packaging? This helps us work with our carriers and improve our processes.

We'll respond within 1-2 business days of receiving the photos.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  // ── Chargeback / refund_policy ──────────────────────────────────────────
  {
    name: "Chargeback - we've received notice",
    category: "refund_policy",
    subject: "Regarding your payment dispute - Order {orderNumber}",
    body: `Dear {customerName},

We've received notice of a payment dispute for order {orderNumber}. We'd like to resolve this directly if possible.

If you're unhappy with your order, please reply to this email and we'll do our best to put things right. Resolving directly is often quicker than going through your bank.

We're here to help.

Best regards,
{company_name}`,
    safetyLevel: "risky",
  },
  // ── Address change / request_more_info ──────────────────────────────────
  {
    name: "Address change - before dispatch",
    category: "request_more_info",
    subject: "Address change for order {orderNumber}",
    body: `Dear {customerName},

We've updated the delivery address for your order {orderNumber} as requested.

Your order will be sent to the new address. If you need to make any further changes before we dispatch, please reply immediately.

Best regards,
{company_name}`,
    safetyLevel: "moderate",
  },
  {
    name: "Address change - after dispatch",
    category: "request_more_info",
    subject: "Address change - Order {orderNumber} already dispatched",
    body: `Dear {customerName},

We've received your request to change the delivery address for order {orderNumber}. Unfortunately, your order has already been dispatched and we're unable to redirect it.

You may be able to arrange a redirection with the carrier - we'll include the tracking details in a separate email. If the parcel is returned to us, we can resend to your new address.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  // ── Cancel order / custom ────────────────────────────────────────────────
  {
    name: "Order cancellation - confirmed",
    category: "custom",
    subject: "Order {orderNumber} cancelled",
    body: `Dear {customerName},

We've cancelled your order {orderNumber} as requested.

If payment was taken, a full refund will be processed within 5-10 business days. You're welcome to place a new order at any time.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  {
    name: "Order cancellation - too late",
    category: "custom",
    subject: "Order {orderNumber} - already dispatched",
    body: `Dear {customerName},

We've received your cancellation request for order {orderNumber}. Unfortunately, your order has already been dispatched and we're unable to cancel it.

If you no longer need the items, you can return them once received under our 30-day returns policy. Please reply if you'd like a returns label.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  // ── General enquiry / general_faq ───────────────────────────────────────
  {
    name: "General enquiry - thank you",
    category: "general_faq",
    subject: "We've received your message",
    body: `Dear {customerName},

Thank you for getting in touch. We've received your message and a member of our team will respond within 1-2 business days.

If your query is urgent, please include "Urgent" in the subject line.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  {
    name: "Opening hours",
    category: "general_faq",
    subject: "Our opening hours",
    body: `Dear {customerName},

Our customer service team is available:

Monday - Friday: 9am - 5pm GMT
Saturday: 10am - 2pm GMT
Sunday: Closed

We aim to respond to all emails within 1-2 business days.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  {
    name: "Product availability",
    category: "general_faq",
    subject: "Product availability",
    body: `Dear {customerName},

Thank you for your interest. We're checking availability with our warehouse and will get back to you within 1-2 business days with an update.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  // ── Complaint / custom ───────────────────────────────────────────────────
  {
    name: "Complaint - acknowledged",
    category: "custom",
    subject: "We're sorry - we've received your feedback",
    body: `Dear {customerName},

We're sorry to hear about your experience. We've received your message and take all feedback seriously.

A senior member of our team will review your case and respond personally within 2-3 business days. We want to make this right.

Best regards,
{company_name}`,
    safetyLevel: "moderate",
  },
  {
    name: "Complaint - escalation",
    category: "custom",
    subject: "Your feedback has been escalated",
    body: `Dear {customerName},

Thank you for your patience. Your case has been escalated to our management team, who will contact you directly within 2 business days.

We're committed to resolving this to your satisfaction.

Best regards,
{company_name}`,
    safetyLevel: "risky",
  },
  // ── Additional common scenarios ───────────────────────────────────────────
  {
    name: "Missing item - investigating",
    category: "custom",
    subject: "We're looking into your order {orderNumber}",
    body: `Dear {customerName},

We're sorry to hear that an item from your order {orderNumber} is missing. We're investigating this with our warehouse and will get back to you within 2 business days.

If we're unable to locate the item, we'll send a replacement or process a refund for that item.

Best regards,
{company_name}`,
    safetyLevel: "moderate",
  },
  {
    name: "Wrong item sent",
    category: "custom",
    subject: "Replacement for incorrect item - Order {orderNumber}",
    body: `Dear {customerName},

We're sorry that the wrong item was sent with your order {orderNumber}. We'll send the correct item to you as soon as possible at no extra charge.

Please let us know if you'd like to return the incorrect item - we can send a prepaid label.

Best regards,
{company_name}`,
    safetyLevel: "moderate",
  },
  {
    name: "Pre-sales question",
    category: "request_more_info",
    subject: "Re: Your question",
    body: `Dear {customerName},

Thank you for your question. We've passed it to our product team and will respond with the information you need within 1-2 business days.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  {
    name: "Delivery instructions",
    category: "delivery_info",
    subject: "Delivery instructions for order {orderNumber}",
    body: `Dear {customerName},

We've noted your delivery instructions for order {orderNumber}. We'll pass these to the carrier. Please note that carriers cannot always fulfil special requests, but we'll do our best.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
  {
    name: "Gift message",
    category: "custom",
    subject: "Gift message for order {orderNumber}",
    body: `Dear {customerName},

We've added your gift message to order {orderNumber}. We'll include it with the delivery. We don't include prices in the package.

Best regards,
{company_name}`,
    safetyLevel: "safe",
  },
];

function extractVariables(text: string): string[] {
  const regex = /\{([a-zA-Z0-9_]+)\}/g;
  const matches = [...text.matchAll(regex)];
  return [...new Set(matches.map((m) => m[1]))];
}

export const run: ActionRun = async ({ api, logger }) => {
  const existing = await api.template.findMany({
    select: { name: true },
    first: 500,
  });
  const existingNames = new Set((existing || []).map((t: { name: string }) => t.name));

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const t of SEED_TEMPLATES) {
    if (existingNames.has(t.name)) {
      skipped++;
      continue;
    }

    const allText = `${t.subject} ${t.body}`;
    const vars = extractVariables(allText);
    const availableVariables = vars.length > 0 ? vars : ["customerName", "orderNumber", "company_name"];

    try {
      const templateCreate = (api as { internal?: { template?: { create: typeof api.template.create } } }).internal?.template?.create ?? api.template.create;
      await templateCreate({
        name: t.name,
        category: t.category,
        subject: t.subject,
        bodyText: t.body,
        availableVariables,
        requiredVariables: [],
        safetyLevel: t.safetyLevel,
        active: true,
        description: t.description ?? undefined,
        autoSendEnabled: false,
      });
      created++;
      existingNames.add(t.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ name: t.name, error: msg }, "Failed to create template");
      if (errors.length < 3) errors.push(`${t.name}: ${msg}`);
    }
  }

  logger.info({ created, skipped, total: SEED_TEMPLATES.length, errors: errors.length }, "Seed complete");
  return { created, skipped, total: SEED_TEMPLATES.length, errors };
};

export const options: ActionOptions = {
  triggers: { api: true },
};
