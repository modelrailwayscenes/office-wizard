import OpenAI from "openai";
import { api } from "gadget-server";
import { logger } from "gadget-server";

// Type definitions
export interface EmailContent {
  subject: string;
  body: string;
  fromAddress: string;
  fromName?: string;
  toAddresses?: string[];
  receivedDateTime: Date;
  hasAttachments?: boolean;
}

export interface ClassificationContext {
  conversationHistory?: any[];
  previousClassifications?: any[];
  orderSystemData?: any;
}

export interface ExtractedEntities {
  orderId?: string;
  customerName?: string;
  deadlineDates?: string[];
  moneyAmounts?: string[];
  productNames?: string[];
  hasAddressInfo: boolean;
}

export interface RiskFlags {
  containsLegalThreat: boolean;
  containsChargebackMention: boolean;
  containsNegativeReview: boolean;
  requiresRefund: boolean;
}

export interface SentimentAnalysis {
  sentimentLabel: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  sentimentScore: number;
  emotionTags: string[];
}

export interface ClassificationResult {
  senderType: 'customer' | 'supplier' | 'internal' | 'automated_system' | 'spam_marketing' | 'unknown';
  intentCategory: 'refund_cancellation' | 'complaint' | 'order_issue' | 'delivery_deadline' | 'technical_product_help' | 'presales_question' | 'general_question' | 'other';
  intentConfidence: number;
  automationTag: 'auto_reply' | 'auto_resolve' | 'human_required' | 'escalate';
  automationConfidence: number;
  automationReason: string;
  extractedEntities: ExtractedEntities;
  sentimentLabel: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  emotionTags: string[];
  riskFlags: RiskFlags;
}

// Initialize OpenAI client (will be configured on first use)
let openaiClient: OpenAI | null = null;
let appConfig: any = null;

/**
 * Get or initialize OpenAI client
 */
async function getOpenAIClient(): Promise<OpenAI | null> {
  if (openaiClient) {
    return openaiClient;
  }

  try {
    // Try to get API key from environment or connections
    const apiKey = process.env.OPENAI_API_KEY || process.env.GADGET_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      logger.warn("No OpenAI API key found, will use rules-based classification");
      return null;
    }

    openaiClient = new OpenAI({ apiKey });
    return openaiClient;
  } catch (error) {
    logger.error({ error }, "Failed to initialize OpenAI client");
    return null;
  }
}

/**
 * Get app configuration
 */
async function getAppConfiguration(): Promise<any> {
  if (appConfig) {
    return appConfig;
  }

  try {
    const configs = await api.appConfiguration.findMany({ first: 1 });
    if (configs.length > 0) {
      appConfig = configs[0];
    } else {
      // Return default configuration
      appConfig = {
        customerDomains: [],
        excludedSenders: [],
        neverAutoSendCategories: ["refund_cancellation", "complaint"],
        autoSendConfidenceThreshold: 0.85,
        riskKeywords: ["legal", "lawyer", "chargeback", "court", "lawsuit"],
        openaiModel: "gpt-4"
      };
    }
    return appConfig;
  } catch (error) {
    logger.error({ error }, "Failed to load app configuration");
    // Return default configuration
    return {
      customerDomains: [],
      excludedSenders: [],
      neverAutoSendCategories: ["refund_cancellation", "complaint"],
      autoSendConfidenceThreshold: 0.85,
      riskKeywords: ["legal", "lawyer", "chargeback", "court", "lawsuit"],
      openaiModel: "gpt-4"
    };
  }
}

/**
 * Identify sender type based on email address and configuration
 */
export async function identifySenderType(
  emailContent: EmailContent,
  config?: any
): Promise<'customer' | 'supplier' | 'internal' | 'automated_system' | 'spam_marketing' | 'unknown'> {
  const appConfig = config || await getAppConfiguration();
  const fromAddress = emailContent.fromAddress.toLowerCase();
  const fromName = emailContent.fromName?.toLowerCase() || "";

  // Check excluded senders (internal/automated)
  const excludedSenders = appConfig.excludedSenders || [];
  for (const excluded of excludedSenders) {
    if (fromAddress.includes(excluded.toLowerCase())) {
      return 'internal';
    }
  }

  // Check for automated system patterns
  if (
    fromName.includes("noreply") ||
    fromName.includes("no-reply") ||
    fromAddress.includes("noreply") ||
    fromAddress.includes("no-reply") ||
    fromAddress.includes("automated") ||
    fromAddress.includes("notifications")
  ) {
    return 'automated_system';
  }

  // Check customer domains
  const customerDomains = appConfig.customerDomains || [];
  for (const domain of customerDomains) {
    if (fromAddress.includes(domain.toLowerCase())) {
      return 'customer';
    }
  }

  // Check for common B2B/supplier patterns
  if (
    fromAddress.includes("invoice") ||
    fromAddress.includes("sales@") ||
    fromAddress.includes("accounts@") ||
    fromAddress.includes("purchasing@")
  ) {
    return 'supplier';
  }

  // Default to customer if we have order-related content
  const emailText = `${emailContent.subject} ${emailContent.body}`.toLowerCase();
  if (
    emailText.includes("order") ||
    emailText.includes("delivery") ||
    emailText.includes("tracking")
  ) {
    return 'customer';
  }

  return 'unknown';
}

/**
 * Extract entities from email text using regex patterns
 */
export function extractEntities(emailText: string): ExtractedEntities {
  const entities: ExtractedEntities = {
    hasAddressInfo: false
  };

  // Extract order IDs
  const orderIdPatterns = [
    /#(\d{4,})/gi,
    /order\s*(?:number|#|id)?\s*:?\s*(\d{4,})/gi,
    /order\s+(\d{4,})/gi
  ];

  for (const pattern of orderIdPatterns) {
    const matches = emailText.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        entities.orderId = match[1];
        break;
      }
    }
    if (entities.orderId) break;
  }

  // Extract customer names
  const namePattern = /(?:my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
  const nameMatch = emailText.match(namePattern);
  if (nameMatch) {
    entities.customerName = nameMatch[1];
  }

  // Extract money amounts
  const moneyPattern = /[£$€]\s*\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:pounds|dollars|euros|GBP|USD|EUR)/gi;
  const moneyMatches = emailText.match(moneyPattern);
  if (moneyMatches) {
    entities.moneyAmounts = moneyMatches;
  }

  // Extract dates
  const datePattern = /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?)\b/gi;
  const dateMatches = emailText.match(datePattern);
  if (dateMatches) {
    entities.deadlineDates = dateMatches;
  }

  // Check for address info (without storing actual address)
  const addressPatterns = [
    /\d+\s+[A-Z][a-z]+\s+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr)/i,
    /postcode|postal code|zip code/i,
    /\b[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2}\b/i // UK postcode pattern
  ];

  for (const pattern of addressPatterns) {
    if (pattern.test(emailText)) {
      entities.hasAddressInfo = true;
      break;
    }
  }

  return entities;
}

/**
 * Analyze sentiment and emotions in email text
 */
export async function analyzeSentiment(emailText: string): Promise<SentimentAnalysis> {
  const client = await getOpenAIClient();

  if (client) {
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a sentiment analysis expert. Analyze the sentiment and emotions in customer emails.
            
Respond with a JSON object containing:
- sentimentLabel: one of 'very_negative', 'negative', 'neutral', 'positive', 'very_positive'
- sentimentScore: a number from -1.0 (very negative) to 1.0 (very positive)
- emotionTags: an array of emotion words like ['frustrated', 'angry', 'confused', 'disappointed', 'grateful', 'satisfied']

Be accurate and nuanced in your assessment.`
          },
          {
            role: "user",
            content: emailText
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return {
        sentimentLabel: result.sentimentLabel || 'neutral',
        sentimentScore: result.sentimentScore || 0,
        emotionTags: result.emotionTags || []
      };
    } catch (error) {
      logger.warn({ error }, "OpenAI sentiment analysis failed, using fallback");
    }
  }

  // Fallback: rules-based sentiment analysis
  const lowerText = emailText.toLowerCase();
  
  // Negative keywords
  const veryNegativeWords = ['furious', 'disgusted', 'worst', 'terrible', 'horrible', 'scam', 'fraud'];
  const negativeWords = ['angry', 'disappointed', 'frustrated', 'unhappy', 'upset', 'problem', 'issue'];
  
  // Positive keywords
  const positiveWords = ['thank', 'thanks', 'grateful', 'appreciate', 'happy', 'satisfied', 'excellent'];
  
  let sentimentScore = 0;
  const emotionTags: string[] = [];

  // Check for very negative
  if (veryNegativeWords.some(word => lowerText.includes(word))) {
    sentimentScore = -0.9;
    emotionTags.push('angry', 'frustrated');
    return { sentimentLabel: 'very_negative', sentimentScore, emotionTags };
  }

  // Check for negative
  if (negativeWords.some(word => lowerText.includes(word))) {
    sentimentScore = -0.5;
    emotionTags.push('disappointed');
    return { sentimentLabel: 'negative', sentimentScore, emotionTags };
  }

  // Check for positive
  if (positiveWords.some(word => lowerText.includes(word))) {
    sentimentScore = 0.7;
    emotionTags.push('grateful');
    return { sentimentLabel: 'positive', sentimentScore, emotionTags };
  }

  return { sentimentLabel: 'neutral', sentimentScore: 0, emotionTags: [] };
}

/**
 * Detect risk flags that require human review
 */
export function detectRiskFlags(emailText: string, classification?: any): RiskFlags {
  const lowerText = emailText.toLowerCase();

  const legalKeywords = ['lawyer', 'attorney', 'legal action', 'court', 'solicitor', 'lawsuit', 'sue'];
  const chargebackKeywords = ['chargeback', 'dispute', 'bank dispute', 'credit card dispute'];
  const reviewKeywords = ['review', 'social media', 'facebook', 'twitter', 'instagram', 'tell everyone', 'warn others'];
  const refundKeywords = ['refund', 'money back', 'return my money', 'want my money', 'give me back'];

  return {
    containsLegalThreat: legalKeywords.some(keyword => lowerText.includes(keyword)),
    containsChargebackMention: chargebackKeywords.some(keyword => lowerText.includes(keyword)),
    containsNegativeReview: reviewKeywords.some(keyword => lowerText.includes(keyword)) && 
                            (lowerText.includes('bad') || lowerText.includes('negative') || lowerText.includes('warning')),
    requiresRefund: refundKeywords.some(keyword => lowerText.includes(keyword))
  };
}

/**
 * Determine automation suitability based on classification and risk flags
 */
export async function determineAutomationSuitability(
  classification: any,
  riskFlags: RiskFlags,
  config?: any
): Promise<{ automationTag: 'auto_reply' | 'auto_resolve' | 'human_required' | 'escalate'; automationConfidence: number; automationReason: string }> {
  const appConfig = config || await getAppConfiguration();
  const neverAutoSend = appConfig.neverAutoSendCategories || ['refund_cancellation', 'complaint'];
  const confidenceThreshold = appConfig.autoSendConfidenceThreshold || 0.85;

  // Check for risk flags - highest priority
  if (riskFlags.containsLegalThreat) {
    return {
      automationTag: 'escalate',
      automationConfidence: 1.0,
      automationReason: 'Legal threat detected - requires immediate human review'
    };
  }

  if (riskFlags.containsChargebackMention) {
    return {
      automationTag: 'escalate',
      automationConfidence: 1.0,
      automationReason: 'Chargeback mention detected - requires immediate human review'
    };
  }

  if (riskFlags.containsNegativeReview && classification.sentimentLabel === 'very_negative') {
    return {
      automationTag: 'escalate',
      automationConfidence: 0.95,
      automationReason: 'Negative review threat with very negative sentiment - requires human attention'
    };
  }

  // Check for categories that should never be auto-sent
  if (neverAutoSend.includes(classification.intentCategory)) {
    return {
      automationTag: 'human_required',
      automationConfidence: 1.0,
      automationReason: `Category '${classification.intentCategory}' requires human review per configuration`
    };
  }

  // Check sentiment
  if (classification.sentimentLabel === 'very_negative') {
    return {
      automationTag: 'human_required',
      automationConfidence: 0.9,
      automationReason: 'Very negative sentiment detected - human empathy required'
    };
  }

  // Check confidence threshold
  if (classification.intentConfidence < confidenceThreshold) {
    return {
      automationTag: 'human_required',
      automationConfidence: classification.intentConfidence,
      automationReason: `Intent confidence (${classification.intentConfidence.toFixed(2)}) below threshold (${confidenceThreshold})`
    };
  }

  // Safe categories with high confidence can be auto-replied
  const safeFAQCategories = ['general_question', 'presales_question', 'technical_product_help'];
  
  if (safeFAQCategories.includes(classification.intentCategory) && classification.intentConfidence >= confidenceThreshold) {
    // Check if it can be resolved completely or just replied to
    if (classification.intentCategory === 'general_question' && classification.sentimentLabel !== 'negative') {
      return {
        automationTag: 'auto_resolve',
        automationConfidence: classification.intentConfidence,
        automationReason: 'Simple FAQ question with high confidence - can be auto-resolved'
      };
    }
    
    return {
      automationTag: 'auto_reply',
      automationConfidence: classification.intentConfidence,
      automationReason: 'Safe FAQ category with sufficient confidence - can send automated reply'
    };
  }

  // Default: require human review
  return {
    automationTag: 'human_required',
    automationConfidence: 0.5,
    automationReason: 'Does not meet criteria for automation - requires human review'
  };
}

/**
 * Classify email using OpenAI
 */
async function classifyWithOpenAI(
  emailContent: EmailContent,
  context?: ClassificationContext
): Promise<Partial<ClassificationResult>> {
  const client = await getOpenAIClient();
  
  if (!client) {
    throw new Error("OpenAI client not available");
  }

  const appConfig = await getAppConfiguration();
  const model = appConfig.openaiModel || "gpt-4";

  const systemPrompt = `You are an expert email classification system for customer support. Analyze emails and classify them accurately.

Intent Categories:
- refund_cancellation: Customer wants money back or to cancel order
- complaint: Customer is unhappy with product/service
- order_issue: Problems with placing, modifying, or finding orders
- delivery_deadline: Questions about shipping, tracking, or delivery times
- technical_product_help: How to use product, troubleshooting
- presales_question: Questions before purchasing
- general_question: General inquiries, business hours, policies
- other: Doesn't fit above categories

Sender Types:
- customer: End customer
- supplier: Vendor or business partner
- internal: Internal company email
- automated_system: Automated notifications
- spam_marketing: Unsolicited marketing
- unknown: Cannot determine

Respond with a JSON object containing:
{
  "intentCategory": "<category>",
  "intentConfidence": <0.0-1.0>,
  "senderType": "<type>",
  "sentimentLabel": "<very_negative|negative|neutral|positive|very_positive>",
  "emotionTags": ["<emotion1>", "<emotion2>"],
  "extractedEntities": {
    "orderId": "<order_id if found>",
    "customerName": "<name if found>",
    "productNames": ["<product1>", "<product2>"]
  }
}

Be conservative with confidence scores. Only use high confidence (>0.85) when intent is very clear.`;

  const emailText = `Subject: ${emailContent.subject}\n\nFrom: ${emailContent.fromName || emailContent.fromAddress}\n\nBody:\n${emailContent.body}`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: emailText }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    
    return {
      intentCategory: result.intentCategory || 'other',
      intentConfidence: result.intentConfidence || 0.5,
      senderType: result.senderType || 'unknown',
      sentimentLabel: result.sentimentLabel || 'neutral',
      emotionTags: result.emotionTags || [],
      extractedEntities: {
        orderId: result.extractedEntities?.orderId,
        customerName: result.extractedEntities?.customerName,
        productNames: result.extractedEntities?.productNames,
        hasAddressInfo: false
      }
    };
  } catch (error) {
    logger.error({ error }, "OpenAI classification failed");
    throw error;
  }
}

/**
 * Rules-based fallback classification
 */
function classifyWithRules(emailContent: EmailContent): Partial<ClassificationResult> {
  const emailText = `${emailContent.subject} ${emailContent.body}`.toLowerCase();
  
  // Determine intent category based on keywords
  let intentCategory: ClassificationResult['intentCategory'] = 'other';
  let intentConfidence = 0.6;

  if (emailText.includes('refund') || emailText.includes('cancel') || emailText.includes('money back')) {
    intentCategory = 'refund_cancellation';
    intentConfidence = 0.7;
  } else if (emailText.includes('complaint') || emailText.includes('disappointed') || emailText.includes('terrible')) {
    intentCategory = 'complaint';
    intentConfidence = 0.7;
  } else if (emailText.includes('order') && (emailText.includes('problem') || emailText.includes('issue'))) {
    intentCategory = 'order_issue';
    intentConfidence = 0.65;
  } else if (emailText.includes('delivery') || emailText.includes('tracking') || emailText.includes('shipping')) {
    intentCategory = 'delivery_deadline';
    intentConfidence = 0.7;
  } else if (emailText.includes('how to') || emailText.includes('how do i') || emailText.includes('help with')) {
    intentCategory = 'technical_product_help';
    intentConfidence = 0.65;
  } else if (emailText.includes('before') && emailText.includes('buy')) {
    intentCategory = 'presales_question';
    intentConfidence = 0.6;
  } else if (emailText.includes('question') || emailText.includes('wondering') || emailText.includes('hours')) {
    intentCategory = 'general_question';
    intentConfidence = 0.6;
  }

  return {
    intentCategory,
    intentConfidence,
    senderType: 'customer'
  };
}

/**
 * Main classification function
 */
export async function classifyEmail(
  emailContent: EmailContent,
  context?: ClassificationContext
): Promise<ClassificationResult> {
  try {
    logger.info({ subject: emailContent.subject, from: emailContent.fromAddress }, "Starting email classification");

    // Try OpenAI classification first
    let classification: Partial<ClassificationResult>;
    
    try {
      classification = await classifyWithOpenAI(emailContent, context);
    } catch (error) {
      logger.warn({ error }, "OpenAI classification failed, using rules-based fallback");
      classification = classifyWithRules(emailContent);
    }

    // Identify sender type
    const senderType = classification.senderType || await identifySenderType(emailContent);

    // Extract entities
    const emailText = `${emailContent.subject}\n${emailContent.body}`;
    const extractedEntities = extractEntities(emailText);
    
    // Merge with any entities from OpenAI
    if (classification.extractedEntities) {
      extractedEntities.orderId = extractedEntities.orderId || classification.extractedEntities.orderId;
      extractedEntities.customerName = extractedEntities.customerName || classification.extractedEntities.customerName;
      extractedEntities.productNames = extractedEntities.productNames || classification.extractedEntities.productNames;
    }

    // Analyze sentiment (if not already done by OpenAI)
    let sentiment: SentimentAnalysis;
    if (classification.sentimentLabel && classification.emotionTags) {
      sentiment = {
        sentimentLabel: classification.sentimentLabel,
        sentimentScore: 0, // Not provided by OpenAI in this case
        emotionTags: classification.emotionTags
      };
    } else {
      sentiment = await analyzeSentiment(emailText);
    }

    // Detect risk flags
    const riskFlags = detectRiskFlags(emailText, classification);

    // Determine automation suitability
    const automation = await determineAutomationSuitability(
      { ...classification, ...sentiment },
      riskFlags
    );

    const result: ClassificationResult = {
      senderType,
      intentCategory: classification.intentCategory || 'other',
      intentConfidence: classification.intentConfidence || 0.5,
      automationTag: automation.automationTag,
      automationConfidence: automation.automationConfidence,
      automationReason: automation.automationReason,
      extractedEntities,
      sentimentLabel: sentiment.sentimentLabel,
      emotionTags: sentiment.emotionTags,
      riskFlags
    };

    logger.info({ 
      intentCategory: result.intentCategory, 
      automationTag: result.automationTag,
      senderType: result.senderType
    }, "Email classification completed");

    return result;

  } catch (error) {
    logger.error({ error }, "Email classification failed completely, returning conservative defaults");
    
    // Return very conservative classification on complete failure
    return {
      senderType: 'unknown',
      intentCategory: 'other',
      intentConfidence: 0.3,
      automationTag: 'human_required',
      automationConfidence: 0.0,
      automationReason: 'Classification system error - requires human review',
      extractedEntities: {
        hasAddressInfo: false
      },
      sentimentLabel: 'neutral',
      emotionTags: [],
      riskFlags: {
        containsLegalThreat: false,
        containsChargebackMention: false,
        containsNegativeReview: false,
        requiresRefund: false
      }
    };
  }
}