import { useFindOne, useFindMany } from "@gadgetinc/react";
import { Link, useParams, Navigate } from "react-router";
import { format } from "date-fns";
import { ArrowLeft, AlertTriangle, Mail, Paperclip } from "lucide-react";

import { api } from "../api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function formatDateTime(value: string | Date | null | undefined, fmt = "PPp") {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, fmt);
}

function titleCaseEnum(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

const conversationSelect = {
  id: true,
  subject: true,
  status: true,
  primaryCustomerName: true,
  primaryCustomerEmail: true,
  currentPriorityBand: true,
  currentPriorityScore: true,
  currentCategory: true,
  automationTag: true,
  messageCount: true,
  unreadCount: true,
  firstMessageAt: true,
  latestMessageAt: true,
  resolved: true,
  resolvedAt: true,
  requiresHumanReview: true,
  internalNotes: true,
} as const;

const messageSelect = {
  id: true,
  subject: true,
  bodyPreview: true,
  fromAddress: true,
  fromName: true,
  toAddresses: true,
  receivedDateTime: true,
  sentDateTime: true,
  isRead: true,
  hasAttachments: true,
  importance: true,
} as const;

export default function ConversationDetail() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  const [{ data: conversation, fetching, error }] = useFindOne(api.conversation, conversationId!, {
    pause: !conversationId,
    select: conversationSelect,
  });

  const [{ data: messages, fetching: fetchingMessages }] = useFindMany(api.emailMessage, {
    pause: !conversationId,
    filter: {
      conversationId: { equals: conversationId }
    },
    sort: {
      receivedDateTime: "Ascending"
    },
    select: messageSelect,
  });

  if (!conversationId) {
    return <Navigate to="/conversations" replace />;
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link to="/conversations" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Conversations
          </Link>

          <Card className="bg-zinc-950/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Loading…</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-400">Fetching conversation details.</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link to="/conversations" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Conversations
          </Link>

          <Card className="bg-zinc-950/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Couldn't load conversation</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-400">
              Please try again. If it keeps happening, check permissions or that the record exists.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link to="/conversations" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Conversations
          </Link>

          <Card className="bg-zinc-950/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Not found</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-400">No conversation exists with ID {conversationId}.</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const priority = conversation.currentPriorityBand ?? "unclassified";
  const priorityClass =
    priority === "P0"
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : priority === "P1"
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : priority === "P2"
      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
      : "bg-zinc-500/10 text-zinc-300 border-zinc-500/20";

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to="/conversations" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Conversations
        </Link>

        <Card className="bg-zinc-950/50 border-zinc-800">
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-xl">{conversation.subject ?? "(No subject)"}</CardTitle>
                <div className="mt-1 text-sm text-zinc-400">ID: {conversation.id}</div>
              </div>
              <Badge variant="outline" className={priorityClass}>
                {priority}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {conversation.requiresHumanReview && (
              <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-500/20 rounded-md">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">Requires Human Review</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-md border border-zinc-800 bg-zinc-900/20 p-3">
                <div className="text-xs text-zinc-500">Customer</div>
                <div className="text-sm font-medium">{conversation.primaryCustomerName ?? "—"}</div>
                <div className="text-sm text-zinc-400">{conversation.primaryCustomerEmail ?? "—"}</div>
              </div>

              <div className="rounded-md border border-zinc-800 bg-zinc-900/20 p-3">
                <div className="text-xs text-zinc-500">Status</div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-zinc-900/50 border-zinc-800">
                    {conversation.status ? titleCaseEnum(String(conversation.status)) : "—"}
                  </Badge>
                  {conversation.resolved && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                      Resolved
                    </Badge>
                  )}
                  {conversation.automationTag && conversation.automationTag !== "none" && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                      {titleCaseEnum(String(conversation.automationTag))}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-zinc-800 bg-zinc-900/20 p-3">
                <div className="text-xs text-zinc-500">Category</div>
                <div className="text-sm font-medium">
                  {conversation.currentCategory ? titleCaseEnum(String(conversation.currentCategory)) : "—"}
                </div>
                <div className="text-sm text-zinc-400">
                  Priority score:{" "}
                  {typeof conversation.currentPriorityScore === "number"
                    ? conversation.currentPriorityScore.toFixed(3)
                    : "—"}
                </div>
              </div>

              <div className="rounded-md border border-zinc-800 bg-zinc-900/20 p-3">
                <div className="text-xs text-zinc-500">Messages</div>
                <div className="text-sm font-medium">{conversation.messageCount ?? 0} total</div>
                <div className="text-sm text-zinc-400">{conversation.unreadCount ?? 0} unread</div>
              </div>

              <div className="rounded-md border border-zinc-800 bg-zinc-900/20 p-3">
                <div className="text-xs text-zinc-500">First message</div>
                <div className="text-sm font-medium">{formatDateTime(conversation.firstMessageAt)}</div>
              </div>

              <div className="rounded-md border border-zinc-800 bg-zinc-900/20 p-3">
                <div className="text-xs text-zinc-500">Latest message</div>
                <div className="text-sm font-medium">{formatDateTime(conversation.latestMessageAt)}</div>
              </div>
            </div>

            {conversation.internalNotes && (
              <div className="rounded-md border border-zinc-800 bg-zinc-900/20 p-3">
                <div className="text-xs text-zinc-500 mb-1">Internal Notes</div>
                <div className="text-sm text-zinc-200 whitespace-pre-wrap">{String(conversation.internalNotes)}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Messages ({conversation.messageCount ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fetchingMessages && (
              <div className="text-sm text-zinc-400">Loading messages...</div>
            )}
            
            {!fetchingMessages && messages && messages.length === 0 && (
              <div className="text-sm text-zinc-400">No messages found in this conversation.</div>
            )}

            {!fetchingMessages && messages && messages.length > 0 && (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={message.id}>
                    {index > 0 && <Separator className="bg-zinc-800 my-4" />}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-zinc-200">
                              {message.fromName || message.fromAddress}
                            </span>
                            {!message.isRead && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                                Unread
                              </Badge>
                            )}
                            {message.hasAttachments && (
                              <Paperclip className="h-3 w-3 text-zinc-500" />
                            )}
                            {message.importance === "high" && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                                High Priority
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {message.fromAddress}
                          </div>
                          {message.toAddresses && Array.isArray(message.toAddresses) && message.toAddresses.length > 0 && (
                            <div className="text-xs text-zinc-500">
                              To: {message.toAddresses.join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 whitespace-nowrap">
                          {formatDateTime(message.receivedDateTime || message.sentDateTime, "PPp")}
                        </div>
                      </div>
                      
                      {message.subject && (
                        <div className="text-sm font-medium text-zinc-300">
                          {message.subject}
                        </div>
                      )}
                      
                      {message.bodyPreview && (
                        <div className="text-sm text-zinc-400 line-clamp-3">
                          {message.bodyPreview}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
