type RawConfig = Record<string, any> | null | undefined;

export type SupportSettings = {
  // Triage/workflow
  autoTriageEnabled: boolean;
  manualReviewQueue: boolean;
  riskScoring: boolean;
  timeSensitivity: boolean;
  sentimentAnalysis: boolean;
  customerValueScoring: boolean;
  ageWeightPointsPerDay: number;
  autoResolveSimple: boolean;
  autoSuggestResponses: boolean;
  workflowBatchProcessing: boolean;

  // Batch ops
  bulkActionsEnabled: boolean;
  scheduledActionsEnabled: boolean;
  batchSize: number;
  maxEmailsPerTriage: number;

  // AI
  classificationProvider: string;
  openaiModel: string;
  temperature: number;
  autoSendGlobalEnabled: boolean;
  autoSendConfidenceThreshold: number;
  autoSendProductInstructions: boolean;
  autoSendTrackingRequests: boolean;
  autoSendGeneralFAQ: boolean;
  autoSendOpeningHours: boolean;
  autoSendMaxPerDay: number;
  chatgptIntegrationEnabled: boolean;

  // Alerts/channels
  notifyOnP0: boolean;
  notifyOnP1: boolean;
  notifyOnHighPriority: boolean;
  notifyOnNewConversation: boolean;
  notifyOnCustomerReply: boolean;
  notifyOnAutoSendFailure: boolean;
  emailNotificationsEnabled: boolean;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
  notificationEmail: string;
  teamsWebhookUrl: string;

  // Admin/platform behavior
  ignoreLastSyncAt: boolean;
  telemetryBannersEnabled: boolean;
  debugModeEnabled: boolean;
  backupSchedule: string;
  backupRetentionDays: number;

  // Security/policy
  retentionDays: number;
  auditLogRetentionDays: number;
  autoArchiveEnabled: boolean;
  deleteArchivedData: boolean;
  ipWhitelist: string;
  redactAddresses: boolean;
  require2FA: boolean;
  sessionTimeoutMinutes: number;
  pwRequireMinLength: boolean;
  pwRequireUppercase: boolean;
  pwRequireNumbers: boolean;
  pwRequireSpecial: boolean;
  pwRequireExpiry: boolean;
  auditLogAuth: boolean;
  auditLogEmailAccess: boolean;
  auditLogConfigChanges: boolean;
  auditLogExports: boolean;
};

export type AuditLogCategory = "auth" | "email_access" | "config_change" | "export";

export const supportSettingsSelect = {
  autoTriageEnabled: true,
  manualReviewQueue: true,
  riskScoring: true,
  timeSensitivity: true,
  sentimentAnalysis: true,
  customerValueScoring: true,
  ageWeightPointsPerDay: true,
  autoResolveSimple: true,
  autoSuggestResponses: true,
  workflowBatchProcessing: true,
  bulkActionsEnabled: true,
  scheduledActionsEnabled: true,
  batchSize: true,
  maxEmailsPerTriage: true,
  classificationProvider: true,
  openaiModel: true,
  temperature: true,
  autoSendGlobalEnabled: true,
  autoSendConfidenceThreshold: true,
  autoSendProductInstructions: true,
  autoSendTrackingRequests: true,
  autoSendGeneralFAQ: true,
  autoSendOpeningHours: true,
  autoSendMaxPerDay: true,
  chatgptIntegrationEnabled: true,
  notifyOnP0: true,
  notifyOnP1: true,
  notifyOnHighPriority: true,
  notifyOnNewConversation: true,
  notifyOnCustomerReply: true,
  notifyOnAutoSendFailure: true,
  emailNotificationsEnabled: true,
  dailyDigestEnabled: true,
  dailyDigestTime: true,
  notificationEmail: true,
  teamsWebhookUrl: true,
  ignoreLastSyncAt: true,
  telemetryBannersEnabled: true,
  debugModeEnabled: true,
  backupSchedule: true,
  backupRetentionDays: true,
  retentionDays: true,
  auditLogRetentionDays: true,
  autoArchiveEnabled: true,
  deleteArchivedData: true,
  ipWhitelist: true,
  redactAddresses: true,
  require2FA: true,
  sessionTimeoutMinutes: true,
  pwRequireMinLength: true,
  pwRequireUppercase: true,
  pwRequireNumbers: true,
  pwRequireSpecial: true,
  pwRequireExpiry: true,
  auditLogAuth: true,
  auditLogEmailAccess: true,
  auditLogConfigChanges: true,
  auditLogExports: true,
} as const;

function asNumber(value: any, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveSupportSettings(config: RawConfig): SupportSettings {
  return {
    autoTriageEnabled: Boolean(config?.autoTriageEnabled ?? false),
    manualReviewQueue: Boolean(config?.manualReviewQueue ?? true),
    riskScoring: Boolean(config?.riskScoring ?? true),
    timeSensitivity: Boolean(config?.timeSensitivity ?? true),
    sentimentAnalysis: Boolean(config?.sentimentAnalysis ?? true),
    customerValueScoring: Boolean(config?.customerValueScoring ?? true),
    ageWeightPointsPerDay: asNumber(config?.ageWeightPointsPerDay, 0),
    autoResolveSimple: Boolean(config?.autoResolveSimple ?? false),
    autoSuggestResponses: Boolean(config?.autoSuggestResponses ?? true),
    workflowBatchProcessing: Boolean(config?.workflowBatchProcessing ?? true),
    bulkActionsEnabled: Boolean(config?.bulkActionsEnabled ?? true),
    scheduledActionsEnabled: Boolean(config?.scheduledActionsEnabled ?? false),
    batchSize: asNumber(config?.batchSize, 50),
    maxEmailsPerTriage: asNumber(config?.maxEmailsPerTriage, 500),
    classificationProvider: String(config?.classificationProvider ?? "openai"),
    openaiModel: String(config?.openaiModel ?? "gpt-4"),
    temperature: asNumber(config?.temperature, 0.7),
    autoSendGlobalEnabled: Boolean(config?.autoSendGlobalEnabled ?? false),
    autoSendConfidenceThreshold: asNumber(config?.autoSendConfidenceThreshold, 0.85),
    autoSendProductInstructions: Boolean(config?.autoSendProductInstructions ?? false),
    autoSendTrackingRequests: Boolean(config?.autoSendTrackingRequests ?? false),
    autoSendGeneralFAQ: Boolean(config?.autoSendGeneralFAQ ?? false),
    autoSendOpeningHours: Boolean(config?.autoSendOpeningHours ?? false),
    autoSendMaxPerDay: asNumber(config?.autoSendMaxPerDay, 50),
    chatgptIntegrationEnabled: Boolean(config?.chatgptIntegrationEnabled ?? true),
    notifyOnP0: Boolean(config?.notifyOnP0 ?? false),
    notifyOnP1: Boolean(config?.notifyOnP1 ?? false),
    notifyOnHighPriority: Boolean(config?.notifyOnHighPriority ?? false),
    notifyOnNewConversation: Boolean(config?.notifyOnNewConversation ?? false),
    notifyOnCustomerReply: Boolean(config?.notifyOnCustomerReply ?? false),
    notifyOnAutoSendFailure: Boolean(config?.notifyOnAutoSendFailure ?? false),
    emailNotificationsEnabled: Boolean(config?.emailNotificationsEnabled ?? false),
    dailyDigestEnabled: Boolean(config?.dailyDigestEnabled ?? false),
    dailyDigestTime: String(config?.dailyDigestTime ?? "09:00"),
    notificationEmail: String(config?.notificationEmail ?? ""),
    teamsWebhookUrl: String(config?.teamsWebhookUrl ?? ""),
    ignoreLastSyncAt: Boolean(config?.ignoreLastSyncAt ?? false),
    telemetryBannersEnabled: Boolean(config?.telemetryBannersEnabled ?? true),
    debugModeEnabled: Boolean(config?.debugModeEnabled ?? false),
    backupSchedule: String(config?.backupSchedule ?? "daily"),
    backupRetentionDays: asNumber(config?.backupRetentionDays, 30),
    retentionDays: asNumber(config?.retentionDays, 90),
    auditLogRetentionDays: asNumber(config?.auditLogRetentionDays, 365),
    autoArchiveEnabled: Boolean(config?.autoArchiveEnabled ?? true),
    deleteArchivedData: Boolean(config?.deleteArchivedData ?? false),
    ipWhitelist: String(config?.ipWhitelist ?? ""),
    redactAddresses: Boolean(config?.redactAddresses ?? false),
    require2FA: Boolean(config?.require2FA ?? false),
    sessionTimeoutMinutes: asNumber(config?.sessionTimeoutMinutes, 30),
    pwRequireMinLength: Boolean(config?.pwRequireMinLength ?? true),
    pwRequireUppercase: Boolean(config?.pwRequireUppercase ?? true),
    pwRequireNumbers: Boolean(config?.pwRequireNumbers ?? true),
    pwRequireSpecial: Boolean(config?.pwRequireSpecial ?? true),
    pwRequireExpiry: Boolean(config?.pwRequireExpiry ?? false),
    auditLogAuth: Boolean(config?.auditLogAuth ?? true),
    auditLogEmailAccess: Boolean(config?.auditLogEmailAccess ?? true),
    auditLogConfigChanges: Boolean(config?.auditLogConfigChanges ?? true),
    auditLogExports: Boolean(config?.auditLogExports ?? true),
  };
}

export function shouldRecordAudit(settings: SupportSettings, category: AuditLogCategory): boolean {
  switch (category) {
    case "auth":
      return settings.auditLogAuth;
    case "email_access":
      return settings.auditLogEmailAccess;
    case "config_change":
      return settings.auditLogConfigChanges;
    case "export":
      return settings.auditLogExports;
    default:
      return true;
  }
}

export function normalizeIpWhitelist(whitelist: string): string[] {
  return whitelist
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isIpAllowedForSupport(ip: string, whitelist: string): boolean {
  const entries = normalizeIpWhitelist(whitelist);
  if (entries.length === 0) return true;
  if (!ip) return false;

  for (const entry of entries) {
    if (entry === ip) return true;
    if (entry.endsWith("*") && ip.startsWith(entry.slice(0, -1))) return true;

    // Lightweight CIDR support for IPv4 /8, /16, /24 and /32.
    const cidrMatch = entry.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(8|16|24|32)$/);
    if (!cidrMatch) continue;
    const [, base, prefix] = cidrMatch;
    const baseParts = base.split(".");
    const ipParts = ip.split(".");
    if (ipParts.length !== 4) continue;
    const octetCount = Number(prefix) / 8;
    let matches = true;
    for (let i = 0; i < octetCount; i++) {
      if (baseParts[i] !== ipParts[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}
