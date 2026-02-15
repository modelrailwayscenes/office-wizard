// Route param types
export type IdParam = { id: string };

// Common row types based on select shapes used in the UI
export type TeamMember = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  initials: string;
  gradient: string;
  lastSignedIn: Date | null;
  emailVerified: boolean | null;
  imageUrl: string | null;
};

export type ConversationRow = {
  id: string;
  subject: string;
  status: string;
  primaryCustomerName: string | null;
  primaryCustomerEmail: string | null;
  currentPriorityBand: string;
  currentPriorityScore: number | null;
  currentCategory: string | null;
  automationTag: string;
  messageCount: number;
  unreadCount: number;
  firstMessageAt: Date;
  latestMessageAt: Date;
  resolved: boolean;
  resolvedAt: Date | null;
  requiresHumanReview: boolean;
  internalNotes: string | null;
};

export type SignatureRow = {
  id: string;
  name: string;
  body: string;
  importance: string | null;
  signOff: string | null;
  bcc: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TemplateRow = {
  id: string;
  name: string;
  category: string;
  safetyLevel: string;
  subject: string;
  bodyText: string;
  signature: { id: string } | null;
};