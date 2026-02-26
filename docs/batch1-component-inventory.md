# Batch 1 Component Inventory (Email Rendering + UI Hierarchy)

## Screen inventory and current patterns

### Customer Support
- `web/routes/_app.customer.support.conversations._index.tsx`
  - **Headers:** `PageHeader` + telemetry/status strips
  - **Primary actions:** Fetch emails, rebuild, refresh
  - **Secondary actions:** Filters, bulk actions in sticky bar
  - **List/table pattern:** `AutoTable` with row-click detail panel
  - **Badge/chip patterns:** `UnifiedBadge`, `SentimentBadge`, custom markers
- `web/routes/_app.customer.support.conversations.$id.tsx`
  - **Headers:** Inline title card and metadata cards
  - **Primary actions:** Navigate back, status visibility
  - **List/table pattern:** Message timeline list
  - **Badge/chip patterns:** `Badge` + `UnifiedBadge`
- `web/routes/_app.customer.support.triage.tsx`
  - **Headers:** `PageHeader` + status chips
  - **Primary actions:** Refresh, batch actions, generate draft/send
  - **List pattern:** Split list/detail with quick filters
  - **Badge/chip patterns:** `UnifiedBadge`, `SentimentBadge`, `Badge`
- `web/routes/_app.customer.support.threads.tsx`
  - **Headers:** `PageHeader` + admin ops strip
  - **Primary actions:** Run triage, refresh
  - **List pattern:** Split list/detail thread explorer
  - **Badge/chip patterns:** `UnifiedBadge`, `SentimentBadge`

## Target reusable checklist

- **`PageHeader`**: title, subtitle, right-side action group
- **`ActionBar`**: quick filters, search, and primary action cluster
- **`StatusChip`**: unified status labels (`new`, `resolved`, etc.)
- **`PriorityChip`**: unified urgency/priority band labels
- **`SentimentChip`**: unified sentiment label set
- **`CardSection`**: normalized section card with heading + body spacing
- **`DataTable`**: list/table header with count + filter row + actions
- **`EmptyState`**: calm no-data state with one primary recovery action

## Batch 1 alignment targets

- Introduce reusable email rendering component for clean body display.
- Remove repeated ad hoc message-preview rendering in detail views.
- Move conversation detail UI to one coherent hierarchy:
  - Header row (subject + chips + key actions)
  - Tabbed sections: `Conversation`, `Customer`, `Automation`
- Keep list page structure consistent:
  - Header
  - Filter row
  - Count visibility
  - Primary actions
