import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
} from "lucide-react";

interface ConversationDetailProps {
  conversation: any;
}

const priorityColors = {
  P0: "bg-red-500 text-white",
  P1: "bg-orange-500 text-white",
  P2: "bg-yellow-500 text-black",
  P3: "bg-green-500 text-white",
  unclassified: "bg-gray-400 text-white",
} as const;

const statusColors = {
  new: "bg-blue-500 text-white",
  in_progress: "bg-purple-500 text-white",
  waiting_customer: "bg-yellow-500 text-black",
  waiting_internal: "bg-orange-500 text-white",
  resolved: "bg-green-500 text-white",
  archived: "bg-gray-500 text-white",
} as const;

const automationTagLabels = {
  auto_reply: "Auto Reply",
  auto_resolve: "Auto Resolve",
  human_required: "Human Required",
  escalate: "Escalate",
  none: "None",
} as const;

const intentCategoryLabels = {
  refund_cancellation: "Refund/Cancellation",
  complaint: "Complaint",
  order_issue: "Order Issue",
  delivery_deadline: "Delivery Deadline",
  technical_product_help: "Technical/Product Help",
  presales_question: "Presales Question",
  general_question: "General Question",
  other: "Other",
} as const;

const sentimentLabels = {
  very_negative: "Very Negative",
  negative: "Negative",
  neutral: "Neutral",
  positive: "Positive",
  very_positive: "Very Positive",
} as const;

// Safe lookup helpers (avoid indexing with `any`)
const getPriorityClass = (band: unknown) =>
  priorityColors[
    (typeof band === "string" &&
      band in priorityColors &&
      (band as keyof typeof priorityColors)) ||
      "unclassified"
  ];

const getStatusClass = (status: unknown) =>
  statusColors[
    (typeof status === "string" &&
      status in statusColors &&
      (status as keyof typeof statusColors)) ||
      "new"
  ];

const getAutomationLabel = (tag: unknown) =>
  automationTagLabels[
    (typeof tag === "string" &&
      tag in automationTagLabels &&
      (tag as keyof typeof automationTagLabels)) ||
      "none"
  ];

const getIntentLabel = (intent: unknown) =>
  intentCategoryLabels[
    (typeof intent === "string" &&
      intent in intentCategoryLabels &&
      (intent as keyof typeof intentCategoryLabels)) ||
      "other"
  ];

const getSentimentLabel = (sent: unknown) =>
  sentimentLabels[
    (typeof sent === "string" &&
      sent in sentimentLabels &&
      (sent as keyof typeof sentimentLabels)) ||
      "neutral"
  ];

const getSentimentBadgeColor = (sentiment: unknown) => {
  const sentimentValue =
    typeof sentiment === "string" && sentiment in sentimentLabels
      ? (sentiment as keyof typeof sentimentLabels)
      : "neutral";

  switch (sentimentValue) {
    case "very_negative":
      return "bg-red-600 text-white";
    case "negative":
      return "bg-orange-500 text-white";
    case "neutral":
      return "bg-gray-400 text-white";
    case "positive":
      return "bg-green-500 text-white";
    case "very_positive":
      return "bg-emerald-600 text-white";
    default:
      return "bg-gray-400 text-white";
  }
};

const formatScore = (score: unknown): string => {
  if (typeof score !== "number") return "N/A";
  return score.toFixed(2);
};

const formatDate = (dateString: unknown) => {
  if (typeof dateString !== "string" || !dateString) return "N/A";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ConversationDetail: React.FC<ConversationDetailProps> = ({
  conversation,
}) => {
  if (!conversation) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            No conversation data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort messages by most recent first
  const sortedMessages = [...(conversation.messages?.edges || [])].sort(
    (a: any, b: any) => {
      const dateA = new Date(
        a?.node?.receivedDateTime || a?.node?.sentDateTime || 0
      );
      const dateB = new Date(
        b?.node?.receivedDateTime || b?.node?.sentDateTime || 0
      );
      return dateB.getTime() - dateA.getTime();
    }
  );

  // Get the most recent classification
  const latestClassification = conversation.classifications?.edges?.[0]?.node;

  return (
    <div className="space-y-4 p-4">
      {/* Conversation Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">
                {conversation.subject || "(no subject)"}
              </CardTitle>
              <CardDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    {conversation.primaryCustomerName || "Unknown Customer"}
                  </p>
                  <p className="text-sm">{conversation.primaryCustomerEmail}</p>
                </div>
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge
                className={getPriorityClass(
                  conversation.currentPriorityBand ?? "unclassified"
                )}
              >
                {conversation.currentPriorityBand || "Unclassified"}
                {typeof conversation.currentPriorityScore === "number"
                  ? ` (${conversation.currentPriorityScore.toFixed(1)})`
                  : ""}
              </Badge>
              <Badge className={getStatusClass(conversation.status ?? "new")}>
                {typeof conversation.status === "string" && conversation.status
                  ? conversation.status.replaceAll("_", " ").toUpperCase()
                  : "NEW"}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Messages</p>
              <p className="font-medium">{conversation.messageCount || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Started</p>
              <p className="font-medium">
                {formatDate(conversation.firstMessageAt)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Activity</p>
              <p className="font-medium">
                {formatDate(conversation.latestMessageAt)}
              </p>
            </div>
            {conversation.assignedTo && (
              <div>
                <p className="text-muted-foreground">Assigned To</p>
                <p className="font-medium">{conversation.assignedTo}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Analysis */}
      {latestClassification && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Sentiment Label
                </p>
                <Badge
                  className={getSentimentBadgeColor(
                    latestClassification.sentimentLabel
                  )}
                >
                  {getSentimentLabel(latestClassification.sentimentLabel)}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Sentiment Score
                </p>
                <p className="font-mono text-lg font-semibold">
                  {formatScore(latestClassification.sentimentScore)}/3.0
                </p>
              </div>
            </div>

            {Array.isArray(latestClassification.emotionTags) &&
              latestClassification.emotionTags.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Emotion Tags
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {latestClassification.emotionTags.map(
                      (tag: string, i: number) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}

            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Risk Metrics
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    Churn Risk
                  </p>
                  <p className="font-semibold">
                    {formatScore(latestClassification.riskChurnScore)}
                    <span className="text-xs text-muted-foreground">/3.0</span>
                  </p>
                  {typeof latestClassification.riskChurnScore === "number" &&
                    latestClassification.riskChurnScore >= 2 && (
                      <Badge
                        variant="destructive"
                        className="mt-1 text-xs"
                      >
                        High
                      </Badge>
                    )}
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    Time Sensitivity
                  </p>
                  <p className="font-semibold">
                    {formatScore(latestClassification.timeSensitivityScore)}
                    <span className="text-xs text-muted-foreground">/3.0</span>
                  </p>
                  {typeof latestClassification.timeSensitivityScore ===
                    "number" &&
                    latestClassification.timeSensitivityScore >= 2 && (
                      <Badge
                        variant="destructive"
                        className="mt-1 text-xs"
                      >
                        Urgent
                      </Badge>
                    )}
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    Operational Blocker
                  </p>
                  <p className="font-semibold">
                    {formatScore(latestClassification.operationalBlockerScore)}
                    <span className="text-xs text-muted-foreground">/3.0</span>
                  </p>
                  {typeof latestClassification.operationalBlockerScore ===
                    "number" &&
                    latestClassification.operationalBlockerScore >= 2 && (
                      <Badge
                        variant="destructive"
                        className="mt-1 text-xs"
                      >
                        Critical
                      </Badge>
                    )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Explanation */}
      {latestClassification && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Priority Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Priority Band &amp; Score
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  className={getPriorityClass(
                    latestClassification.priorityBand ?? "unclassified"
                  )}
                >
                  {latestClassification.priorityBand || "unclassified"}
                </Badge>
                <span className="font-mono text-lg font-semibold">
                  {typeof latestClassification.priorityScore === "number"
                    ? latestClassification.priorityScore.toFixed(2)
                    : "N/A"}
                </span>
              </div>
            </div>

            {Array.isArray(latestClassification.topDrivers) &&
              latestClassification.topDrivers.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Top Priority Drivers
                  </p>
                  <ul className="space-y-1">
                    {latestClassification.topDrivers.map(
                      (driver: any, index: number) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-muted-foreground">•</span>
                          <span>
                            <strong>{driver.factor}:</strong> {driver.reason}
                            {typeof driver.score === "number"
                              ? ` (${driver.score.toFixed(1)})`
                              : ""}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

            {latestClassification.automationTag && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Automation Recommendation
                </p>
                <div className="space-y-1">
                  <Badge variant="outline">
                    {getAutomationLabel(latestClassification.automationTag)}
                  </Badge>
                  {latestClassification.automationReason && (
                    <p className="text-sm mt-1">
                      {latestClassification.automationReason}
                    </p>
                  )}
                  {typeof latestClassification.automationConfidence ===
                    "number" && (
                    <p className="text-xs text-muted-foreground">
                      Confidence:{" "}
                      {(latestClassification.automationConfidence * 100).toFixed(
                        0
                      )}
                      %
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Message Timeline</CardTitle>
          <CardDescription>Most recent first</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {sortedMessages.length > 0 ? (
                sortedMessages.map((messageEdge: any, index: number) => {
                  const message = messageEdge?.node ?? {};
                  return (
                    <div key={message.id || index}>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {message.fromName || message.fromAddress || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {message.fromAddress || "—"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(
                              message.receivedDateTime || message.sentDateTime
                            )}
                          </p>
                        </div>
                        {message.subject && (
                          <p className="text-sm font-medium">
                            {message.subject}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {message.bodyPreview || "No preview available"}
                        </p>
                        {message.hasAttachments && (
                          <Badge variant="outline" className="text-xs">
                            <Package className="w-3 h-3 mr-1" />
                            Has Attachments
                          </Badge>
                        )}
                      </div>
                      {index < sortedMessages.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  No messages found.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Classification Details */}
      {latestClassification && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Classification Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="intent">
                <AccordionTrigger>Intent &amp; Sentiment</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Intent Category
                      </p>
                      <Badge>{getIntentLabel(latestClassification.intentCategory)}</Badge>
                      {typeof latestClassification.intentConfidence ===
                        "number" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Confidence:{" "}
                          {(latestClassification.intentConfidence * 100).toFixed(
                            0
                          )}
                          %
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Sentiment
                      </p>
                      <Badge variant="outline">
                        {getSentimentLabel(latestClassification.sentimentLabel)}
                      </Badge>
                      {typeof latestClassification.sentimentScore ===
                        "number" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Score: {latestClassification.sentimentScore.toFixed(1)}
                          /3.0
                        </p>
                      )}
                    </div>

                    {Array.isArray(latestClassification.emotionTags) &&
                      latestClassification.emotionTags.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Emotion Tags
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {latestClassification.emotionTags.map(
                              (tag: string, i: number) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="entities">
                <AccordionTrigger>Extracted Entities</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {latestClassification.extractedOrderId && (
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Order ID
                          </p>
                          <p className="font-mono text-sm">
                            {latestClassification.extractedOrderId}
                          </p>
                        </div>
                      </div>
                    )}

                    {latestClassification.extractedCustomerName && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Customer Name
                        </p>
                        <p className="text-sm">
                          {latestClassification.extractedCustomerName}
                        </p>
                      </div>
                    )}

                    {Array.isArray(latestClassification.extractedDeadlineDates) &&
                      latestClassification.extractedDeadlineDates.length >
                        0 && (
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Deadline Dates
                            </p>
                            {latestClassification.extractedDeadlineDates.map(
                              (date: string, i: number) => (
                                <p key={i} className="text-sm">
                                  {formatDate(date)}
                                </p>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {Array.isArray(latestClassification.extractedMoneyAmounts) &&
                      latestClassification.extractedMoneyAmounts.length > 0 && (
                        <div className="flex items-start gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Money Amounts
                            </p>
                            {latestClassification.extractedMoneyAmounts.map(
                              (amount: any, i: number) => (
                                <p key={i} className="text-sm">
                                  {amount?.currency ?? "—"} {amount?.amount ?? "—"}
                                </p>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {Array.isArray(latestClassification.extractedProductNames) &&
                      latestClassification.extractedProductNames.length >
                        0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Products Mentioned
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {latestClassification.extractedProductNames.map(
                              (product: string, i: number) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {product}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="risk">
                <AccordionTrigger>Risk Flags &amp; Indicators</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {latestClassification.containsLegalThreat && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Legal Threat
                          </span>
                        </div>
                      )}
                      {latestClassification.containsChargebackMention && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Chargeback Mention
                          </span>
                        </div>
                      )}
                      {latestClassification.containsNegativeReview && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Negative Review Threat
                          </span>
                        </div>
                      )}
                      {latestClassification.requiresRefund && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Refund Required
                          </span>
                        </div>
                      )}
                    </div>

                    {typeof latestClassification.riskChurnScore === "number" &&
                      latestClassification.riskChurnScore > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Churn Risk Score
                          </p>
                          <p className="text-sm font-medium">
                            {latestClassification.riskChurnScore.toFixed(1)}/3.0
                          </p>
                        </div>
                      )}

                    {typeof latestClassification.escalationScore === "number" &&
                      latestClassification.escalationScore > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Escalation Score
                          </p>
                          <p className="text-sm font-medium">
                            {latestClassification.escalationScore.toFixed(1)}/3.0
                          </p>
                        </div>
                      )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="metadata">
                <AccordionTrigger>Additional Metadata</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    {latestClassification.senderType && (
                      <div>
                        <span className="text-muted-foreground">
                          Sender Type:
                        </span>{" "}
                        <Badge variant="outline" className="ml-1">
                          {String(latestClassification.senderType).replaceAll(
                            "_",
                            " "
                          )}
                        </Badge>
                      </div>
                    )}

                    {latestClassification.scoringConfidence && (
                      <div>
                        <span className="text-muted-foreground">
                          Scoring Confidence:
                        </span>{" "}
                        <span className="ml-1 capitalize">
                          {String(latestClassification.scoringConfidence)}
                        </span>
                      </div>
                    )}

                    {latestClassification.modelVersion && (
                      <div>
                        <span className="text-muted-foreground">
                          Model Version:
                        </span>{" "}
                        <span className="ml-1 font-mono text-xs">
                          {String(latestClassification.modelVersion)}
                        </span>
                      </div>
                    )}

                    {latestClassification.classifiedAt && (
                      <div>
                        <span className="text-muted-foreground">
                          Classified At:
                        </span>{" "}
                        <span className="ml-1">
                          {formatDate(latestClassification.classifiedAt)}
                        </span>
                      </div>
                    )}

                    {latestClassification.scoringNotes && (
                      <div>
                        <p className="text-muted-foreground mb-1">
                          Scoring Notes:
                        </p>
                        <p className="text-xs bg-muted p-2 rounded">
                          {latestClassification.scoringNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConversationDetail;
