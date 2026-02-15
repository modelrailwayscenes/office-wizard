import React from "react";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Conversation {
  id: string;
  subject: string | null;
  primaryCustomerEmail: string | null;
  primaryCustomerName?: string | null;
  currentPriorityBand: "P0" | "P1" | "P2" | "P3" | "unclassified";
  currentPriorityScore: number | null;
  automationTag: "auto_reply" | "auto_resolve" | "human_required" | "escalate" | "none";
  firstMessageAt: string | null;
  latestMessageAt: string | null;
  status:
    | "new"
    | "in_progress"
    | "waiting_customer"
    | "waiting_internal"
    | "resolved"
    | "archived";
}

interface HighPriorityEmailsProps {
  conversations: Conversation[];
}

const getPriorityBadgeColor = (priority: Conversation["currentPriorityBand"]) => {
  switch (priority) {
    case "P0":
      return "bg-red-500 hover:bg-red-600";
    case "P1":
      return "bg-amber-500 hover:bg-amber-600";
    case "P2":
      return "bg-blue-500 hover:bg-blue-600";
    case "P3":
      return "bg-zinc-500 hover:bg-zinc-600";
    default:
      return "bg-gray-500 hover:bg-gray-600";
  }
};

const getAutomationBadgeColor = (tag: Conversation["automationTag"]) => {
  switch (tag) {
    case "auto_reply":
      return "bg-green-500 hover:bg-green-600";
    case "auto_resolve":
      return "bg-blue-500 hover:bg-blue-600";
    case "human_required":
      return "bg-red-500 hover:bg-red-600";
    case "escalate":
      return "bg-amber-500 hover:bg-amber-600";
    default:
      return "bg-gray-500 hover:bg-gray-600";
  }
};

const getStatusBadgeColor = (status: Conversation["status"]) => {
  switch (status) {
    case "new":
      return "bg-purple-500 hover:bg-purple-600";
    case "in_progress":
      return "bg-blue-500 hover:bg-blue-600";
    case "waiting_customer":
    case "waiting_internal":
      return "bg-yellow-500 hover:bg-yellow-600";
    case "resolved":
      return "bg-green-500 hover:bg-green-600";
    case "archived":
      return "bg-gray-500 hover:bg-gray-600";
    default:
      return "bg-gray-500 hover:bg-gray-600";
  }
};

const titleCaseEnum = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const safeDistanceToNow = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
};

export default function HighPriorityEmails({ conversations }: HighPriorityEmailsProps) {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">High Priority Emails</h2>
        <Badge variant="secondary" className="text-sm">
          {conversations.length} {conversations.length === 1 ? "email" : "emails"}
        </Badge>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-lg text-gray-600">No high priority emails right now! 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-bold line-clamp-2">
                      {conversation.subject ?? "(No subject)"}
                    </CardTitle>
                    <div className="mt-1 text-xs text-gray-500">
                      {conversation.primaryCustomerName ?? "Unknown"} •{" "}
                      {conversation.primaryCustomerEmail ?? "—"}
                    </div>
                  </div>

                  <Badge
                    className={`${getPriorityBadgeColor(
                      conversation.currentPriorityBand
                    )} text-white shrink-0`}
                  >
                    {conversation.currentPriorityBand}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={`${getStatusBadgeColor(conversation.status)} text-white`}
                  >
                    {titleCaseEnum(conversation.status)}
                  </Badge>

                  <Badge
                    className={`${getAutomationBadgeColor(conversation.automationTag)} text-white`}
                  >
                    {titleCaseEnum(conversation.automationTag)}
                  </Badge>

                  <Badge variant="outline" className="text-xs">
                    First: {safeDistanceToNow(conversation.firstMessageAt)}
                  </Badge>

                  <Badge variant="outline" className="text-xs">
                    Latest: {safeDistanceToNow(conversation.latestMessageAt)}
                  </Badge>

                  <Badge variant="outline" className="text-xs">
                    Score:{" "}
                    {typeof conversation.currentPriorityScore === "number"
                      ? conversation.currentPriorityScore.toFixed(3)
                      : "—"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
