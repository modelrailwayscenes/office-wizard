# Settings Ownership Matrix

This matrix defines the ownership model for Settings using a hybrid approach:

- **Global**: Office Wizard-level baseline in `appConfiguration`
- **Module**: setting belongs to one module only
- **Override**: module may override the global baseline (`effectiveValue = override ?? global`)

## Source Of Truth

- Global defaults live in `api/models/appConfiguration/schema.gadget.ts`
- Module overrides live in `moduleSettingOverride` (new model)
- Effective values are resolved with `resolveEffectiveSettingValue()`

## Customer Support Settings Mapping

### Summary
- **Module**: status card composition for Support-only workflows
- **Global**: health signals sourced from global fields (sync, AI, alerts, security)

### Profile
- **Module**: none
- **Global**: user account identity
- **Override**: user-level preference (theme/accessibility) remains user-scoped, not module override

### Users
- **Global**: user/role access management

### Integrations (Admin)
- **Global**: `connectedMailbox`, `supportEmail`, `supportFolder`, `defaultInboxFolder`, `archivedFolder`, `resolvedFolder`
- **Global**: `microsoft*`, `shopify*`, `monday*`, `imap*`, `smtp*`, `syncEnabled`, `lastSyncAt`, `focusedInboxOnly`

### Triage & Workflow
- **Override** candidates:
  - `autoTriageEnabled`
  - `autoSendConfidenceThreshold`
  - `manualReviewQueue`
  - `slaP0`, `slaP1`, `slaP2`, `slaP3`
  - `riskScoring`, `timeSensitivity`, `sentimentAnalysis`, `customerValueScoring`
  - `ageWeightPointsPerDay`
  - `autoResolveSimple`, `autoSuggestResponses`, `workflowBatchProcessing`
- **Global baseline**: same fields above when no module override exists

### AI & Automation
- **Global**: model governance and policy (`classificationProvider`, `openaiModel`, `aiModelVersion`, `temperature`)
- **Override** candidates:
  - `autoSendGlobalEnabled`
  - `autoSendProductInstructions`
  - `autoSendTrackingRequests`
  - `autoSendGeneralFAQ`
  - `autoSendOpeningHours`
  - `chatgptIntegrationEnabled`

### Playbooks & Batching (Templates)
- **Module**: playbook library and workflow behavior for Customer Support
- **Override** candidates:
  - `bulkActionsEnabled`
  - `scheduledActionsEnabled`
  - `batchSize`
  - `maxEmailsPerTriage`
  - `autoSendMaxPerDay`

### Alerts & Notifications (Admin)
- **Global**: channels and policy (`notificationEmail`, `teamsWebhookUrl`, `emailNotificationsEnabled`, `dailyDigest*`)
- **Override** candidates:
  - `notifyOnP0`, `notifyOnP1`, `notifyOnHighPriority`
  - `notifyOnNewConversation`, `notifyOnCustomerReply`, `notifyOnAutoSendFailure`

### Security & Compliance
- **Global** only:
  - `retentionDays`, `auditLogRetentionDays`, `autoArchiveEnabled`, `deleteArchivedData`
  - `ipWhitelist`, `redactAddresses`, `require2FA`, `sessionTimeoutMinutes`
  - password policy fields (`pwRequire*`)
  - compliance fields (`storeFullBodies`, `audit*`, `backup*`)

### Advanced Settings (Admin)
- **Global**: platform behavior and safeguards
- **Override** candidates:
  - `businessHoursFrom`, `businessHoursTo` (if modules operate in separate windows)
  - `telemetryBannersEnabled` (debug visibility per module)
- **Global only**:
  - `apiRateLimitPerMinute`, `cacheDurationMinutes`, `debugModeEnabled`
  - `realTimeUpdatesEnabled`, `prefetchLinks`, `lazyLoadImages`
  - locale defaults (`language`, `timezone`, `dateFormat`, `currency`)

## Marketing Newsletter Settings Mapping

- **Module-owned**:
  - newsletter brand/editor behavior
  - content blocks, templates, schedule/calendars
- **Override** candidates from global defaults:
  - tone/instruction style
  - automation thresholds
  - notification rules relevant to campaign workflows
- **Global**:
  - shared credentials/integrations
  - security/compliance policy
  - platform AI model policy

## Governance Rules

- Platform credentials, security, retention, and compliance remain **Global**
- Workflow behavior is **Module** unless consistency is required across modules
- Shared defaults can be centrally managed and selectively **Overridden** by module
- Any setting in UI must display one of: `Global`, `Module`, or `Override`

## Runtime Wiring Status

Use this as the canonical quick-check for wiring quality.

- **Enforced in runtime services**
  - `riskScoring`, `timeSensitivity`, `sentimentAnalysis`, `customerValueScoring`, `manualReviewQueue`, `autoResolveSimple`, `autoSuggestResponses`
  - `bulkActionsEnabled`, `workflowBatchProcessing`, `batchSize`, `maxEmailsPerTriage`
  - `autoSendProductInstructions`, `autoSendTrackingRequests`, `autoSendGeneralFAQ`, `autoSendConfidenceThreshold`, `autoSendMaxPerDay`
  - `retentionDays`, `auditLogRetentionDays`, `autoArchiveEnabled`, `deleteArchivedData`
  - `ignoreLastSyncAt`, `telemetryBannersEnabled`

- **Persisted and partially enforced**
  - `scheduledActionsEnabled` (gates scheduled bulk triage path)
  - backup policy (`backupSchedule`, `backupRetentionDays`) via backup scheduler/action
  - alert channel fields (`notificationEmail`, `teamsWebhookUrl`, digest flags) in admin/alerts flows

- **Persisted but informational/policy-only today**
  - locale/platform preference fields (`language`, `timezone`, `dateFormat`, `currency`)
  - UI performance hints (`realTimeUpdatesEnabled`, `prefetchLinks`, `lazyLoadImages`, `apiRateLimitPerMinute`)
  - auth-hardening policy fields (`require2FA`, `sessionTimeoutMinutes`, `pwRequire*`, `ipWhitelist`) pending auth-layer middleware enforcement
