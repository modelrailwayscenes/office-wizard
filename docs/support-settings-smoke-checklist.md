# Support Settings Smoke Checklist

Run this after deploying Support settings wiring updates.

## 1) Access and policy gates
- Sign in as admin and non-admin.
- Verify non-admin cannot execute admin-only actions (audit export, backup snapshot, learning reset).
- If `ipWhitelist` is set, verify allowed IP can load app and disallowed IP receives denial.
- Set a short `sessionTimeoutMinutes`, wait past threshold, and verify session is forced to sign-in.

## 2) Placeholder actions replaced
- Profile password change updates password and allows next sign-in with the new secret.
- Security audit export downloads a CSV/JSON payload with expected rows.
- Advanced backup now triggers `runBackup` and updates `lastBackupAt`.
- Advanced backup snapshot download returns JSON payload with policy/count metadata.
- AI learning reset clears learning metadata and returns counts.

## 3) Runtime setting enforcement
- Toggle `scheduledActionsEnabled` off and verify `triageAllPending` skips processing.
- Toggle `chatgptIntegrationEnabled` off and verify classification path falls back to rules mode.
- Toggle `redactAddresses` on and verify exported audit logs redact email addresses.
- Toggle `auditLogExports` off and verify audit export action is blocked.

## 4) UX semantics
- Alerts page shows immediate-apply messaging and no misleading save workflow.
- Controls that autosave show successful persisted state after refresh.
- Admin Settings actions display meaningful success/error toasts.

## 5) Regression checks
- Fetch new emails, triage queue, conversations, and thread detail continue to load.
- Bulk triage and batch operations still work when enabled.
- Production and Finance module toggles still function in Admin Settings.
