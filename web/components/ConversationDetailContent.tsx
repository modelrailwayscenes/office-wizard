import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Paperclip, RefreshCw, UserX } from "lucide-react";
import { SentimentBadge } from "@/components/SentimentBadge";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { getAiCommentStyle } from "@/components/aiCommentUtils";
import { timeAgo } from "@/components/healthStatus";
import { EmailMessageBody } from "@/components/EmailMessageBody";
import { ConversationActionPanel } from "@/components/ConversationActionPanel";

export function ConversationDetailContent({
  conversationData,
  messagesData,
  latestAiComment,
  fetchingConversation,
  fetchingMessages,
  fetchingAiComments,
  conversationError,
  markNotCustomerLoading,
  formatDateTime,
  titleCaseEnum,
  onMarkNotCustomer,
  conversationId,
  onRefresh,
}: {
  conversationData: any;
  messagesData: any[] | undefined;
  latestAiComment: any;
  fetchingConversation: boolean;
  fetchingMessages: boolean;
  fetchingAiComments: boolean;
  conversationError: Error | null;
  markNotCustomerLoading: boolean;
  formatDateTime: (d: string | Date | null | undefined) => string;
  titleCaseEnum: (s: string | null | undefined) => string;
  onMarkNotCustomer: () => void;
  conversationId: string;
  onRefresh?: () => Promise<void> | void;
}) {
  if (fetchingConversation) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (conversationError) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-700 dark:text-red-300">
        <span>Error loading conversation: {conversationError.toString()}</span>
      </div>
    );
  }
  if (!conversationData) return null;

  return (
    <div className="space-y-4">
      {conversationData.currentCategory !== "not_customer" && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-primary hover:border-primary/50"
            onClick={onMarkNotCustomer}
            disabled={markNotCustomerLoading}
          >
            <UserX className="h-4 w-4 mr-2" />
            Mark Not a Customer
          </Button>
        </div>
      )}

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{conversationData.subject || "(No subject)"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <UnifiedBadge type={conversationData.status} label={titleCaseEnum(conversationData.status)} />
            <UnifiedBadge type={conversationData.currentPriorityBand} label={titleCaseEnum(conversationData.currentPriorityBand)} />
            <SentimentBadge sentiment={conversationData.sentiment} />
          </div>
          <Tabs defaultValue="conversation" className="w-full">
            <TabsList>
              <TabsTrigger value="conversation">Conversation</TabsTrigger>
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
            </TabsList>
            <TabsContent value="conversation" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">First Message</p>
                  <p className="text-sm">{formatDateTime(conversationData.firstMessageAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Activity</p>
                  <p className="text-sm">{formatDateTime(conversationData.latestMessageAt)}</p>
                </div>
              </div>
              <Separator className="bg-border" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Category</p>
                  <p className="text-sm">{titleCaseEnum(conversationData.currentCategory)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Message Count</p>
                  <p className="text-sm">{conversationData.messageCount ?? 0}</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="customer" className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Customer</p>
                <p>{conversationData.primaryCustomerName || conversationData.primaryCustomerEmail || "—"}</p>
                {conversationData.primaryCustomerName && conversationData.primaryCustomerEmail && (
                  <p className="text-sm text-muted-foreground">{conversationData.primaryCustomerEmail}</p>
                )}
              </div>
              {conversationData.internalNotes && (
                <>
                  <Separator className="bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Internal Notes</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{conversationData.internalNotes}</p>
                  </div>
                </>
              )}
            </TabsContent>
            <TabsContent value="automation" className="mt-4 space-y-3">
              {conversationData.classifications?.edges?.[0]?.node ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Intent Category</p>
                  <UnifiedBadge
                    type={conversationData.classifications.edges[0].node.intentCategory}
                    label={titleCaseEnum(conversationData.classifications.edges[0].node.intentCategory)}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No classification yet.</p>
              )}
              {conversationData.resolvedAt && (
                <>
                  <Separator className="bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Resolved At</p>
                    <p className="text-sm">{formatDateTime(conversationData.resolvedAt)}</p>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ConversationActionPanel conversation={conversationData} onUpdated={onRefresh} />

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Latest Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {fetchingAiComments ? (
            <div className="text-sm text-muted-foreground">Loading activity...</div>
          ) : latestAiComment ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const style = getAiCommentStyle(latestAiComment.kind);
                    return (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.className}`}>
                        <style.Icon className="h-3 w-3" />
                        {style.label}
                      </span>
                    );
                  })()}
                  {latestAiComment.batchOperation?.id && (
                    <Link to={`/customer/support/triage/history?batch=${latestAiComment.batchOperation.id}`} className="text-[11px] text-primary hover:text-primary/80">
                      Batch {latestAiComment.batchOperation.id}
                    </Link>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground" title={latestAiComment.createdAt ? new Date(latestAiComment.createdAt).toLocaleString() : "Unknown"}>
                  {timeAgo(latestAiComment.createdAt)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground whitespace-pre-wrap">{latestAiComment.content}</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No activity recorded yet.</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fetchingMessages && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {!fetchingMessages && messagesData && messagesData.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No messages found</p>
          )}
          {!fetchingMessages && messagesData && messagesData.length > 0 && (
            <div className="space-y-4">
              {messagesData.map((message: any, index: number) => (
                <div key={message.id} className="p-4 bg-muted/30 border border-border rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{message.fromName || message.fromAddress}</p>
                      {message.fromName && <p className="text-xs text-muted-foreground">{message.fromAddress}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateTime(message.receivedDateTime)}</p>
                  </div>
                  {message.subject && <p className="text-sm font-medium">{message.subject}</p>}
                  {message.hasAttachments && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <Paperclip className="h-3 w-3" />
                      <span>Has attachments</span>
                    </div>
                  )}
                  {message.bodyText && (
                    <div className="mt-2">
                      <EmailMessageBody bodyHtml={(message as any).bodyHtml} bodyText={message.bodyText} bodyPreview={message.bodyPreview} />
                    </div>
                  )}
                  {!message.bodyText && !message.bodyHtml && message.bodyPreview && (
                    <div className="mt-2">
                      <EmailMessageBody bodyPreview={message.bodyPreview} />
                    </div>
                  )}
                  {index < messagesData.length - 1 && <Separator className="bg-border mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Link to={`/customer/support/conversations/${conversationId}`} className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm">
        Open full view →
      </Link>
    </div>
  );
}
