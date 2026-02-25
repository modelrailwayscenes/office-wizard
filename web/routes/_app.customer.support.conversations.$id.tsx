import { useFindOne, useFindMany } from "@gadgetinc/react";
import { Link, useParams, Navigate } from "react-router";
import { format } from "date-fns";
import { ArrowLeft, AlertTriangle, Mail, Paperclip } from "lucide-react";

import { api } from "../api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getAiCommentStyle } from "@/components/aiCommentUtils";
import { timeAgo } from "@/components/healthStatus";

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
};

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
};

export default function ConversationDetail() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  const [{ data: rawConversation, fetching, error }] = useFindOne(api.conversation, conversationId!, {
    pause: !conversationId,
    select: conversationSelect,
  });
  const conversation = rawConversation as any;

  const [{ data: rawMessages, fetching: fetchingMessages }] = useFindMany(api.emailMessage, {
    pause: !conversationId,
    filter: {
      conversationId: { equals: conversationId }
    },
    sort: {
      receivedDateTime: "Ascending"
    },
    select: messageSelect,
  });
  const messages = rawMessages as any[] | undefined;
  const [{ data: rawAiComments, fetching: fetchingAiComments }] = useFindMany(api.aiComment, {
    pause: !conversationId,
    filter: {
      conversationId: { equals: conversationId }
    },
    sort: { createdAt: "Descending" },
    first: 10,
    select: {
      id: true,
      kind: true,
      source: true,
      content: true,
      createdAt: true,
      model: true,
      batchOperation: { id: true },
      user: { id: true, email: true },
    },
  });
  const aiComments = rawAiComments as any[] | undefined;

  if (!conversationId) {
    return <Navigate to="/customer/support/conversations" replace />;
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link to="/customer/support/conversations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Conversations
          </Link>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Loading…</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">Fetching conversation details.</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link to="/customer/support/conversations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Conversations
          </Link>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Couldn't load conversation</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Please try again. If it keeps happening, check permissions or that the record exists.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link to="/customer/support/conversations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Conversations
          </Link>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Not found</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">No conversation exists with ID {conversationId}.</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const priority = conversation.currentPriorityBand ?? "unclassified";
  const priorityClass =
    priority === "P0"
      ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
      : priority === "P1"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
      : priority === "P2"
      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
      : "bg-muted text-muted-foreground border-border";

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to="/customer/support/conversations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Conversations
        </Link>

        <Card className="bg-card border-border">
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-xl">{conversation.subject ?? "(No subject)"}</CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">ID: {conversation.id}</div>
              </div>
              <Badge variant="outline" className={priorityClass}>
                {priority}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {conversation.requiresHumanReview && (
              <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-500/20 rounded-md">
                <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Requires Human Review</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Customer</div>
                <div className="text-sm font-medium">{conversation.primaryCustomerName ?? "—"}</div>
                <div className="text-sm text-muted-foreground">{conversation.primaryCustomerEmail ?? "—"}</div>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-muted/60 border-border">
                    {conversation.status ? titleCaseEnum(String(conversation.status)) : "—"}
                  </Badge>
                  {conversation.resolved && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20">
                      Resolved
                    </Badge>
                  )}
                  {conversation.automationTag && conversation.automationTag !== "none" && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                      {titleCaseEnum(String(conversation.automationTag))}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Category</div>
                <div className="text-sm font-medium">
                  {conversation.currentCategory ? titleCaseEnum(String(conversation.currentCategory)) : "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Priority score:{" "}
                  {typeof conversation.currentPriorityScore === "number"
                    ? conversation.currentPriorityScore.toFixed(3)
                    : "—"}
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Messages</div>
                <div className="text-sm font-medium">{conversation.messageCount ?? 0} total</div>
                <div className="text-sm text-muted-foreground">{conversation.unreadCount ?? 0} unread</div>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">First message</div>
                <div className="text-sm font-medium">{formatDateTime(conversation.firstMessageAt)}</div>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Latest message</div>
                <div className="text-sm font-medium">{formatDateTime(conversation.latestMessageAt)}</div>
              </div>
            </div>

            {conversation.internalNotes && (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">Internal Notes</div>
                <div className="text-sm text-foreground whitespace-pre-wrap">{String(conversation.internalNotes)}</div>
              </div>
            )}

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-2">Activity Timeline</div>
              {fetchingAiComments ? (
                <div className="text-sm text-muted-foreground">Loading activity...</div>
              ) : aiComments && aiComments.length > 0 ? (
                <div className="space-y-3">
                  {aiComments.map((comment) => {
                    const style = getAiCommentStyle(comment.kind);
                    const createdAtLabel = comment.createdAt
                      ? new Date(comment.createdAt).toLocaleString()
                      : "Unknown";
                    return (
                      <div key={comment.id} className="rounded-md border border-border bg-card/70 p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.className}`}
                            >
                              <style.Icon className="h-3 w-3" />
                              {style.label}
                            </span>
                            {comment.batchOperation?.id && (
                              <Link
                                to={`/customer/support/triage/history?batch=${comment.batchOperation.id}`}
                                className="text-[11px] text-primary hover:text-primary/80"
                              >
                                Batch {comment.batchOperation.id}
                              </Link>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground" title={createdAtLabel}>
                            {timeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <div className="text-xs text-foreground whitespace-pre-wrap">
                          {comment.content}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          Source: {comment.source || "system"}
                          {comment.user?.email ? ` · ${comment.user.email}` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No activity recorded yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Messages ({conversation.messageCount ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fetchingMessages && (
              <div className="text-sm text-muted-foreground">Loading messages...</div>
            )}
            
            {!fetchingMessages && messages && messages.length === 0 && (
              <div className="text-sm text-muted-foreground">No messages found in this conversation.</div>
            )}

            {!fetchingMessages && messages && messages.length > 0 && (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={message.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {message.fromName || message.fromAddress}
                            </span>
                            {!message.isRead && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-xs">
                                Unread
                              </Badge>
                            )}
                            {message.hasAttachments && (
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                            )}
                            {message.importance === "high" && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 text-xs">
                                High Priority
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {message.fromAddress}
                          </div>
                          {message.toAddresses && Array.isArray(message.toAddresses) && message.toAddresses.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              To: {message.toAddresses.join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(message.receivedDateTime || message.sentDateTime, "PPp")}
                        </div>
                      </div>
                      
                      {message.subject && (
                        <div className="text-sm font-medium text-foreground">
                          {message.subject}
                        </div>
                      )}
                      
                      {message.bodyPreview && (
                        <div className="text-sm text-muted-foreground line-clamp-3">
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
