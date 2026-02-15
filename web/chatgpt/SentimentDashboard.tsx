import React from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SentimentDashboardProps {
  conversations: Conversation[];
}

interface Conversation {
  id: string;
  subject: string;
  primaryCustomerEmail: string | null;
  primaryCustomerName: string | null;
  sentimentLabel: "very_positive" | "positive" | "neutral" | "negative" | "very_negative" | null;
  sentimentScore: number | null;
  emotionTags: string[] | null;
  riskChurnScore: number | null;
  timeSensitivityScore: number | null;
  operationalBlockerScore: number | null;
  currentPriorityBand: "P0" | "P1" | "P2" | "P3" | "unclassified" | null;
  status: "new" | "in_progress" | "waiting_customer" | "waiting_internal" | "resolved" | "archived";
  latestMessageAt: string;
}

// Helper function to get sentiment badge color
const getSentimentBadgeColor = (sentiment: string | null): string => {
  switch (sentiment) {
    case "very_positive":
    case "positive":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "very_negative":
    case "negative":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    case "neutral":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

// Helper function to get risk badge color based on score
const getRiskBadgeColor = (score: number | null): string => {
  if (score === null) return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  if (score > 0.7) return "bg-red-100 text-red-800 hover:bg-red-100";
  if (score > 0.4) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
  return "bg-green-100 text-green-800 hover:bg-green-100";
};

// Helper function to format score
const formatScore = (score: number | null): string => {
  if (score === null) return "—";
  return score.toFixed(2);
};

const SentimentDashboard: React.FC<SentimentDashboardProps> = ({ conversations }) => {
  // Sort conversations by riskChurnScore descending
  const sortedConversations = [...conversations].sort((a, b) => {
    const scoreA = a.riskChurnScore ?? 0;
    const scoreB = b.riskChurnScore ?? 0;
    return scoreB - scoreA;
  });

  // Calculate summary statistics
  const totalConversations = conversations.length;
  const sentimentBreakdown = conversations.reduce((acc, conv) => {
    const sentiment = conv.sentimentLabel ?? "unknown";
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgRiskChurnScore = conversations.length > 0
    ? conversations.reduce((sum, conv) => sum + (conv.riskChurnScore ?? 0), 0) / conversations.length
    : 0;

  const highRiskCount = conversations.filter(conv => (conv.riskChurnScore ?? 0) > 0.7).length;

  // Handle empty state
  if (conversations.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sentiment Analysis Dashboard</CardTitle>
          <CardDescription>No conversations to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No conversation data available. Start analyzing conversations to see sentiment insights here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sentiment Analysis Dashboard</h1>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {totalConversations} Total
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalConversations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sentiment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {Object.entries(sentimentBreakdown).map(([sentiment, count]) => (
                <div key={sentiment} className="flex justify-between">
                  <span className="capitalize">{sentiment.replace("_", " ")}:</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Risk Churn Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatScore(avgRiskChurnScore)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Risk Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{highRiskCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Conversations by Risk Level</h2>
        <div className="grid grid-cols-1 gap-4">
          {sortedConversations.map((conversation) => (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{conversation.subject}</CardTitle>
                    <CardDescription className="mt-1">
                      {conversation.primaryCustomerName || conversation.primaryCustomerEmail || "Unknown Customer"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge className={getSentimentBadgeColor(conversation.sentimentLabel)}>
                      {conversation.sentimentLabel ? conversation.sentimentLabel.replace("_", " ") : "Unknown"} ({formatScore(conversation.sentimentScore)})
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Emotion Tags */}
                {conversation.emotionTags && conversation.emotionTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {conversation.emotionTags.map((emotion, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {emotion}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Risk Scores */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Churn Risk</p>
                    <Badge className={getRiskBadgeColor(conversation.riskChurnScore)}>
                      {formatScore(conversation.riskChurnScore)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Time Sensitivity</p>
                    <Badge className={getRiskBadgeColor(conversation.timeSensitivityScore)}>
                      {formatScore(conversation.timeSensitivityScore)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Operational Blocker</p>
                    <Badge className={getRiskBadgeColor(conversation.operationalBlockerScore)}>
                      {formatScore(conversation.operationalBlockerScore)}
                    </Badge>
                  </div>
                </div>

                {/* Status and Priority */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex gap-3">
                    <Badge variant="secondary">
                      {conversation.currentPriorityBand || "Unclassified"}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {conversation.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">
                    Last activity: {format(new Date(conversation.latestMessageAt), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SentimentDashboard;