/**
 * Priority Scoring Engine
 * 
 * Calculates priority scores for emails using weighted dimension scores
 * and determines priority bands based on the Email Wizard specification.
 */

interface DimensionScores {
  riskChurnScore: number;
  timeSensitivityScore: number;
  sentimentScore: number;
  operationalBlockerScore: number;
  valueBandScore: number;
  ageFollowupsScore: number;
  escalationScore: number;
  categoryBaseScore: number;
}

interface PriorityResult {
  priorityScore: number;
  priorityBand: 'P0' | 'P1' | 'P2' | 'P3';
  dimensionScores: DimensionScores;
  topDrivers: string[];
  scoringConfidence: 'low' | 'medium' | 'high';
}

interface ScoringWeights {
  risk: number;
  time: number;
  sentiment: number;
  blocker: number;
  value: number;
  age: number;
  escalation: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  risk: 5,
  time: 4,
  sentiment: 4,
  blocker: 4,
  value: 3,
  age: 3,
  escalation: 3,
};

const DEFAULT_CATEGORY_BASE_SCORES: Record<string, number> = {
  refund_cancellation: 10,
  delivery_deadline: 10,
  complaint: 7,
  order_issue: 7,
  technical_product_help: 4,
  presales_question: 2,
  general_question: 1,
  other: 0,
};

const DEFAULT_PRIORITY_THRESHOLDS = {
  P0: 25,
  P1: 18,
  P2: 10,
  P3: 0,
};

/**
 * Main function to calculate complete priority score
 */
export async function calculatePriorityScore(
  classification: any,
  emailMessage: any,
  conversation: any,
  config: any
): Promise<PriorityResult> {
  const weights: ScoringWeights = config.scoringWeights || DEFAULT_WEIGHTS;

  // Calculate all dimension scores
  const dimensionScores: DimensionScores = {
    riskChurnScore: scoreRiskChurn(classification, emailMessage),
    timeSensitivityScore: scoreTimeSensitivity(classification, emailMessage),
    sentimentScore: scoreSentiment(classification),
    operationalBlockerScore: scoreOperationalBlocker(classification, emailMessage),
    valueBandScore: scoreValueBand(classification, emailMessage),
    ageFollowupsScore: scoreAgeFollowups(emailMessage, conversation),
    escalationScore: scoreEscalation(classification, emailMessage),
    categoryBaseScore: getCategoryBaseScore(classification.intentCategory, config),
  };

  // Calculate total priority score using formula
  const priorityScore =
    weights.risk * dimensionScores.riskChurnScore +
    weights.time * dimensionScores.timeSensitivityScore +
    weights.sentiment * dimensionScores.sentimentScore +
    weights.blocker * dimensionScores.operationalBlockerScore +
    weights.value * dimensionScores.valueBandScore +
    weights.age * dimensionScores.ageFollowupsScore +
    weights.escalation * dimensionScores.escalationScore +
    dimensionScores.categoryBaseScore;

  const priorityBand = determinePriorityBand(priorityScore, config);
  const topDrivers = getTopDrivers(dimensionScores, weights, classification, emailMessage, conversation);
  const scoringConfidence = determineScoringConfidence(classification, emailMessage);

  return {
    priorityScore: Math.round(priorityScore * 100) / 100, // Round to 2 decimals
    priorityBand,
    dimensionScores,
    topDrivers,
    scoringConfidence,
  };
}

/**
 * Score risk of customer churn (0-3)
 */
export function scoreRiskChurn(classification: any, emailMessage: any): number {
  let score = 0;

  // Check for highest risk signals (3 points)
  if (classification.containsLegalThreat || classification.containsChargebackMention) {
    return 3;
  }

  const bodyLower = (emailMessage.bodyPreview || '').toLowerCase();
  if (bodyLower.includes('cancel all future orders')) {
    return 3;
  }

  // Check for high risk signals (2 points)
  if (classification.containsNegativeReview) {
    score = 2;
  }

  if (bodyLower.includes('never ordering again') || bodyLower.includes('never order again')) {
    score = Math.max(score, 2);
  }

  // Refund request on high-value order
  if (classification.requiresRefund) {
    const moneyAmounts = parseJsonField(classification.extractedMoneyAmounts) || [];
    if (moneyAmounts.some((amt: any) => parseFloat(amt.amount) > 100)) {
      score = Math.max(score, 2);
    }
  }

  // Check for moderate risk (1 point)
  if (classification.intentCategory === 'complaint' && 
      ['negative', 'very_negative'].includes(classification.sentimentLabel)) {
    score = Math.max(score, 1);
  }

  if (classification.intentCategory === 'refund_cancellation') {
    score = Math.max(score, 1);
  }

  return score;
}

/**
 * Score urgency and deadline pressure (0-3)
 */
export function scoreTimeSensitivity(classification: any, emailMessage: any): number {
  let score = 0;

  const bodyLower = (emailMessage.bodyPreview || '').toLowerCase();
  const subjectLower = (emailMessage.subject || '').toLowerCase();
  const combinedText = bodyLower + ' ' + subjectLower;

  // Check extracted deadline dates
  const deadlines = parseJsonField(classification.extractedDeadlineDates) || [];
  const now = new Date();

  for (const deadline of deadlines) {
    const deadlineDate = new Date(deadline.date || deadline);
    const hoursUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil <= 24 && hoursUntil > 0) {
      return 3; // Deadline within 24 hours
    } else if (hoursUntil <= 168 && hoursUntil > 24) { // 7 days
      score = Math.max(score, 2);
    }
  }

  // Check urgency keywords
  if (
    combinedText.includes('urgent') ||
    combinedText.includes('emergency') ||
    combinedText.includes('asap') ||
    combinedText.includes('immediately')
  ) {
    score = Math.max(score, 3);
  }

  // Event-based deadlines
  if (
    combinedText.includes('wedding') ||
    combinedText.includes('birthday') ||
    combinedText.includes('event')
  ) {
    score = Math.max(score, 2);
  }

  // General time sensitivity
  if (
    combinedText.includes('soon') ||
    combinedText.includes('quick response') ||
    combinedText.includes('time sensitive')
  ) {
    score = Math.max(score, 1);
  }

  // Delivery deadline category
  if (classification.intentCategory === 'delivery_deadline') {
    score = Math.max(score, 2);
  }

  // Outlook importance flag (weak signal, +0.5 modifier)
  if (emailMessage.importance === 'high' && score > 0) {
    score = Math.min(3, score + 0.5);
  }

  return score;
}

/**
 * Score negative sentiment intensity (0-3)
 */
export function scoreSentiment(classification: any): number {
  const sentiment = classification.sentimentLabel || 'neutral';
  const emotions = parseJsonField(classification.emotionTags) || [];

  // Very negative sentiment
  if (sentiment === 'very_negative') {
    // Check for angry/frustrated emotions
    if (emotions.some((e: string) => ['angry', 'frustrated'].includes(e.toLowerCase()))) {
      return 3;
    }
    return 2.5;
  }

  // Negative sentiment
  if (sentiment === 'negative') {
    if (emotions.some((e: string) => ['disappointed', 'upset'].includes(e.toLowerCase()))) {
      return 2;
    }
    return 1.5;
  }

  // Slightly negative or neutral with concern
  if (sentiment === 'neutral' && emotions.some((e: string) => 
    ['concerned', 'worried', 'confused'].includes(e.toLowerCase())
  )) {
    return 1;
  }

  // Positive or neutral
  return 0;
}

/**
 * Score if issue blocks customer or operations (0-3)
 */
export function scoreOperationalBlocker(classification: any, emailMessage: any): number {
  const bodyLower = (emailMessage.bodyPreview || '').toLowerCase();
  const intentCategory = classification.intentCategory;

  // Critical blockers (3 points)
  const criticalKeywords = [
    "doesn't work",
    "not working",
    "can't use",
    "cannot use",
    'broken',
    'payment failed',
    'payment issue',
    'not delivered',
    'never arrived',
  ];

  if (criticalKeywords.some((kw) => bodyLower.includes(kw))) {
    return 3;
  }

  // Significant blockers (2 points)
  const significantKeywords = [
    'missing',
    'wrong item',
    'damaged',
    'defective',
    'incorrect',
    'partial',
  ];

  if (significantKeywords.some((kw) => bodyLower.includes(kw))) {
    return 2;
  }

  // Check intent categories
  if (intentCategory === 'order_issue') {
    return Math.max(2, 0);
  }

  if (intentCategory === 'technical_product_help') {
    // Technical help could be critical or minor
    if (bodyLower.includes('urgent') || bodyLower.includes('critical')) {
      return 2;
    }
    return 1;
  }

  // Minor issues (1 point)
  const minorKeywords = [
    'unclear',
    'confusing',
    'instructions',
    'how to',
    'question about',
  ];

  if (minorKeywords.some((kw) => bodyLower.includes(kw))) {
    return 1;
  }

  return 0;
}

/**
 * Score customer/order value (0-3)
 */
export function scoreValueBand(classification: any, emailMessage: any): number {
  const moneyAmounts = parseJsonField(classification.extractedMoneyAmounts) || [];
  const orderId = classification.extractedOrderId;
  const bodyLower = (emailMessage.bodyPreview || '').toLowerCase();

  // Extract numeric values from money amounts
  const amounts = moneyAmounts
    .map((amt: any) => {
      if (typeof amt === 'number') return amt;
      if (amt.amount) return parseFloat(amt.amount);
      return 0;
    })
    .filter((amt: number) => amt > 0);

  const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

  // High value (3 points)
  if (maxAmount > 100) {
    return 3;
  }

  // Check for repeat customer signals
  const repeatSignals = [
    'previous order',
    'last order',
    'ordered before',
    'regular customer',
    'always order',
  ];

  if (repeatSignals.some((signal) => bodyLower.includes(signal))) {
    return 3;
  }

  // Medium value (2 points)
  if (maxAmount >= 25 && maxAmount <= 100) {
    return 2;
  }

  // Low value but has order (1 point)
  if (maxAmount > 0 && maxAmount < 25) {
    return 1;
  }

  // Has order ID (indicates paying customer)
  if (orderId) {
    return 1;
  }

  return 0;
}

/**
 * Score based on message age and follow-up count (0-3)
 */
export function scoreAgeFollowups(emailMessage: any, conversation: any): number {
  const firstMessageDate = new Date(conversation.firstMessageAt);
  const now = new Date();
  const ageInDays = (now.getTime() - firstMessageDate.getTime()) / (1000 * 60 * 60 * 24);
  const messageCount = conversation.messageCount || 1;
  const followUpCount = messageCount - 1; // Approximate follow-ups

  // Critical age/follow-ups (3 points)
  if (ageInDays >= 7 && followUpCount >= 3) {
    return 3;
  }

  if (ageInDays >= 14) {
    return 3;
  }

  // High age/follow-ups (2 points)
  if (ageInDays >= 3 && ageInDays < 7 && followUpCount >= 2) {
    return 2;
  }

  if (ageInDays >= 7 && ageInDays < 14) {
    return 2;
  }

  // Moderate age/follow-ups (1 point)
  if (ageInDays >= 1 && ageInDays < 3 && followUpCount >= 1) {
    return 1;
  }

  if (ageInDays >= 3 && ageInDays < 7) {
    return 1;
  }

  // Fresh message
  return 0;
}

/**
 * Score channel escalation signals (0-3)
 */
export function scoreEscalation(classification: any, emailMessage: any): number {
  const bodyLower = (emailMessage.bodyPreview || '').toLowerCase();
  const subjectLower = (emailMessage.subject || '').toLowerCase();
  const combinedText = bodyLower + ' ' + subjectLower;

  // Critical escalation (3 points)
  const criticalEscalation = [
    'already contacted',
    'no response',
    'tried calling',
    'called multiple times',
    'posted on social media',
    'left review',
    'filed complaint',
  ];

  if (criticalEscalation.some((phrase) => combinedText.includes(phrase))) {
    return 3;
  }

  // Moderate escalation (2 points)
  const moderateEscalation = [
    'sent previous email',
    'replied but no answer',
    'second email',
    'third time',
    'following up again',
  ];

  if (moderateEscalation.some((phrase) => combinedText.includes(phrase))) {
    return 2;
  }

  // Mild escalation (1 point)
  const mildEscalation = [
    'hope to hear soon',
    'waiting to hear',
    'still waiting',
    'follow up',
    'checking in',
  ];

  if (mildEscalation.some((phrase) => combinedText.includes(phrase))) {
    return 1;
  }

  return 0;
}

/**
 * Get base score for intent category from configuration
 */
export function getCategoryBaseScore(intentCategory: string, config: any): number {
  const categoryScores = parseJsonField(config.categoryBaseScores) || DEFAULT_CATEGORY_BASE_SCORES;
  return categoryScores[intentCategory] || 0;
}

/**
 * Map total score to priority band using thresholds
 */
export function determinePriorityBand(priorityScore: number, config: any): 'P0' | 'P1' | 'P2' | 'P3' {
  const thresholds = parseJsonField(config.priorityBandThresholds) || DEFAULT_PRIORITY_THRESHOLDS;

  if (priorityScore >= thresholds.P0) {
    return 'P0';
  } else if (priorityScore >= thresholds.P1) {
    return 'P1';
  } else if (priorityScore >= thresholds.P2) {
    return 'P2';
  } else {
    return 'P3';
  }
}

/**
 * Identify top 3 scoring factors with human-readable descriptions
 */
export function getTopDrivers(
  dimensionScores: DimensionScores,
  weights: ScoringWeights,
  classification: any,
  emailMessage: any,
  conversation: any
): string[] {
  // Calculate weighted contributions
  const contributions = [
    {
      dimension: 'risk',
      contribution: dimensionScores.riskChurnScore * weights.risk,
      score: dimensionScores.riskChurnScore,
      getDescription: () => {
        if (dimensionScores.riskChurnScore >= 3) {
          if (classification.containsLegalThreat) return 'High churn risk: legal threat detected';
          if (classification.containsChargebackMention) return 'High churn risk: chargeback mention';
          return 'High churn risk: cancel all orders mentioned';
        } else if (dimensionScores.riskChurnScore >= 2) {
          if (classification.containsNegativeReview) return 'Churn risk: negative review threat';
          if (classification.requiresRefund) return 'Churn risk: high-value refund request';
          return 'Churn risk: customer threatening to leave';
        } else if (dimensionScores.riskChurnScore >= 1) {
          return 'Moderate churn risk: complaint with negative sentiment';
        }
        return 'Churn risk detected';
      },
    },
    {
      dimension: 'time',
      contribution: dimensionScores.timeSensitivityScore * weights.time,
      score: dimensionScores.timeSensitivityScore,
      getDescription: () => {
        const deadlines = parseJsonField(classification.extractedDeadlineDates) || [];
        if (deadlines.length > 0 && dimensionScores.timeSensitivityScore >= 3) {
          return 'Time sensitive: deadline within 24 hours';
        } else if (deadlines.length > 0 && dimensionScores.timeSensitivityScore >= 2) {
          return 'Time sensitive: deadline within one week';
        } else if (dimensionScores.timeSensitivityScore >= 3) {
          return 'Urgent: immediate attention required';
        } else if (dimensionScores.timeSensitivityScore >= 1) {
          return 'Time sensitive: quick response needed';
        }
        return 'Time sensitive issue';
      },
    },
    {
      dimension: 'sentiment',
      contribution: dimensionScores.sentimentScore * weights.sentiment,
      score: dimensionScores.sentimentScore,
      getDescription: () => {
        if (dimensionScores.sentimentScore >= 3) {
          return 'Strong negative sentiment: customer very angry';
        } else if (dimensionScores.sentimentScore >= 2) {
          return 'Negative sentiment: customer frustrated';
        } else if (dimensionScores.sentimentScore >= 1) {
          return 'Negative sentiment: customer concerned';
        }
        return 'Negative sentiment detected';
      },
    },
    {
      dimension: 'blocker',
      contribution: dimensionScores.operationalBlockerScore * weights.blocker,
      score: dimensionScores.operationalBlockerScore,
      getDescription: () => {
        if (dimensionScores.operationalBlockerScore >= 3) {
          return 'Critical blocker: product/service unusable';
        } else if (dimensionScores.operationalBlockerScore >= 2) {
          return 'Operational blocker: significant issue';
        } else if (dimensionScores.operationalBlockerScore >= 1) {
          return 'Minor blocker: inconvenience reported';
        }
        return 'Operational blocker detected';
      },
    },
    {
      dimension: 'value',
      contribution: dimensionScores.valueBandScore * weights.value,
      score: dimensionScores.valueBandScore,
      getDescription: () => {
        const amounts = parseJsonField(classification.extractedMoneyAmounts) || [];
        const maxAmount = amounts.length > 0
          ? Math.max(...amounts.map((a: any) => parseFloat(a.amount || a) || 0))
          : 0;

        if (maxAmount > 100) {
          return `High value customer: order over £${maxAmount.toFixed(0)}`;
        } else if (dimensionScores.valueBandScore >= 3) {
          return 'High value: repeat customer detected';
        } else if (maxAmount >= 25) {
          return `Medium value customer: order £${maxAmount.toFixed(0)}`;
        } else if (classification.extractedOrderId) {
          return 'Paying customer: has order ID';
        }
        return 'Customer value identified';
      },
    },
    {
      dimension: 'age',
      contribution: dimensionScores.ageFollowupsScore * weights.age,
      score: dimensionScores.ageFollowupsScore,
      getDescription: () => {
        const ageInDays = Math.floor(
          (new Date().getTime() - new Date(conversation.firstMessageAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        const followUpCount = (conversation.messageCount || 1) - 1;

        if (ageInDays >= 14) {
          return `Old conversation: ${ageInDays} days old`;
        } else if (followUpCount >= 3) {
          return `Multiple follow-ups: ${followUpCount} messages`;
        } else if (ageInDays >= 7) {
          return `Aged conversation: ${ageInDays} days old`;
        } else if (followUpCount >= 1) {
          return `Follow-up: ${followUpCount + 1} messages in thread`;
        }
        return 'Conversation age factor';
      },
    },
    {
      dimension: 'escalation',
      contribution: dimensionScores.escalationScore * weights.escalation,
      score: dimensionScores.escalationScore,
      getDescription: () => {
        if (dimensionScores.escalationScore >= 3) {
          return 'Escalated: customer tried other channels';
        } else if (dimensionScores.escalationScore >= 2) {
          return 'Escalated: repeated contact attempts';
        } else if (dimensionScores.escalationScore >= 1) {
          return 'Escalation signals: waiting for response';
        }
        return 'Escalation detected';
      },
    },
    {
      dimension: 'category',
      contribution: dimensionScores.categoryBaseScore,
      score: dimensionScores.categoryBaseScore,
      getDescription: () => {
        const category = classification.intentCategory;
        const categoryLabels: Record<string, string> = {
          refund_cancellation: 'High priority category: refund/cancellation',
          delivery_deadline: 'High priority category: delivery deadline',
          complaint: 'Priority category: complaint',
          order_issue: 'Priority category: order issue',
          technical_product_help: 'Medium priority category: technical help',
          presales_question: 'Low priority category: pre-sales',
          general_question: 'Low priority category: general inquiry',
        };
        return categoryLabels[category] || `Category: ${category}`;
      },
    },
  ];

  // Sort by contribution and take top 3
  const topThree = contributions
    .filter((c) => c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((c) => c.getDescription());

  return topThree;
}

/**
 * Determine confidence in scoring accuracy
 */
export function determineScoringConfidence(classification: any, emailMessage: any): 'low' | 'medium' | 'high' {
  const intentConfidence = classification.intentConfidence || 0;
  const automationConfidence = classification.automationConfidence || 0;

  // Check if key entities are extracted
  const hasOrderId = !!classification.extractedOrderId;
  const hasDeadlines = (parseJsonField(classification.extractedDeadlineDates) || []).length > 0;
  const hasMoneyAmounts = (parseJsonField(classification.extractedMoneyAmounts) || []).length > 0;
  const hasCustomerName = !!classification.extractedCustomerName;

  const entitiesExtracted = [hasOrderId, hasDeadlines, hasMoneyAmounts, hasCustomerName].filter(Boolean).length;

  // High confidence: strong signals and high classification confidence
  if (intentConfidence >= 0.8 && automationConfidence >= 0.8 && entitiesExtracted >= 2) {
    return 'high';
  }

  // Low confidence: weak signals or low classification confidence
  if (intentConfidence < 0.5 || automationConfidence < 0.5 || entitiesExtracted === 0) {
    return 'low';
  }

  // Medium confidence: everything else
  return 'medium';
}

/**
 * Helper function to safely parse JSON fields
 */
function parseJsonField(field: any): any {
  if (!field) return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return null;
    }
  }
  return field;
}