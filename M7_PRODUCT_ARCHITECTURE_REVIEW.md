# M7 Product Architecture Review

**Type:** Product Architecture Review — approval required before Engineering Design begins
**Date:** 2026-06-27
**Author:** Independent Principal Engineer
**Status:** Proposed — pending approval

---

## Purpose

This review evaluates the proposed scope for Milestone 7, assesses each capability from the perspectives of long-term architecture, production readiness, customer value, operational simplicity, and maintainability, and arrives at a scope decision with sequencing guidance.

M7 is positioned as the completion layer for the Contact Library introduced in M6. M6 built the foundation. M7 makes it useful for the recurring-campaign workflow that is the platform's primary value proposition for high-volume users.

---

## Context

M6 delivered:
- Persistent named contact lists, CSV import, contact management
- Campaign creation from a saved list
- Campaign list snapshot (immutable at creation)

M6 explicitly deferred:
- M6-001: Generic error message for empty-list campaigns
- M6-002: `saveToLibraryAs` fire-and-forget (no confirmation to caller)
- M6-003: CSV export stub (501)
- Campaign Re-Run (named in the architecture review as "the next natural capability")
- Contact edit UI (API exists at PATCH /api/contacts/:id; no UI built)

M7 should close the loop on M6 and deliver the one capability that turns the Contact Library from a storage feature into a workflow feature: **Campaign Re-Run**.

---

## Proposed Capabilities for M7

Five capabilities are evaluated. They are ordered by strategic importance, not implementation order.

---

### Capability 1 — Campaign Re-Run

**What it is:** A user can re-launch a completed campaign to the same contact list, with the same template, without any re-upload or re-configuration. A "Re-run" button in campaign History opens the wizard in a pre-filled state.

**Customer value: High.**

This is the recurring-campaign workflow. A user who sends a monthly outreach to "Enterprise Prospects" currently re-uploads the same CSV every time, re-maps columns, re-selects the template. With Re-Run, they click one button, review the pre-filled wizard, and send. This is the primary behavioural change promised by the Contact Library architecture.

**Architectural assessment:**

The backend requires no new API endpoints. `POST /api/campaigns` already accepts `listId`. The campaign's `templateSnapshot` already contains the subject and body that were sent. Re-Run is a frontend state-management problem.

The campaign wizard (`NewCampaign.jsx` + `CampaignContext`) currently initializes with `INITIAL_STATE`. For Re-Run, the wizard must initialize with pre-filled state derived from the source campaign. This requires:

1. **`CampaignProvider` accepts `initialState` prop.** `useState(initialState ?? INITIAL_STATE)` instead of `useState(INITIAL_STATE)`. No logic change; just a prop.

2. **`NewCampaign` reads `?rerun=<campaignId>` URL param.** If present, it fetches the source campaign via `GET /api/campaigns/:id` and passes derived initial state to `CampaignProvider`. This is the cleanest routing approach: Re-Run URLs are bookmarkable, shareable, and do not require navigation state.

3. **`FileUpload` detects pre-set `listId` on mount.** If `listId` is already set in CampaignContext when FileUpload renders, it should switch to library tab and pre-select that list. A `useEffect` on mount handles this without adding a new prop to FileUpload.

4. **History adds Re-Run button.** Present on all COMPLETED campaigns in the campaign detail modal. On click, navigates to `/app/campaigns/new?rerun=<campaignId>`.

**Two sub-scenarios:**

| Scenario | Condition | Behavior |
|---|---|---|
| **List re-run** | Campaign has `listSnapshot` (list was a saved list) | Pre-fill template + listId. If list was deleted (`listId` now null), pre-fill template only + show amber "Original list '[name]' was deleted — select a different list" message in FileUpload |
| **Template re-use** | Campaign has no `listSnapshot` (upload-path campaign) | Pre-fill template only. FileUpload renders normally with no list pre-selected |

Both sub-scenarios use the same Re-Run button and the same URL parameter. The wizard handles the difference transparently.

**Initial state derived from source campaign:**
```javascript
{
  ...INITIAL_STATE,
  template: {
    name:    sourceCampaign.templateSnapshot?.name    || "",
    subject: sourcecampaign.templateSnapshot?.subject || "",
    body:    sourceCampaign.templateSnapshot?.body    || "",
  },
  listId:       sourcecamp.listId ?? null,
  campaignName: `Re-run: ${sourceCampaign.name}`,
}
```

The user sees a pre-filled TemplateBuilder and a pre-selected library list. They can modify both before confirming. The campaign name defaults to "Re-run: [original name]" and is editable at the confirmation step.

**Risks:**

*Risk 1 — Campaign name collisions.* If a user repeatedly re-runs the same campaign, History will show multiple campaigns named "Re-run: Original Campaign". This is acceptable: the names are distinct timestamps and the History table already shows date/time. No uniqueness enforcement is needed at M7.

*Risk 2 — Stale template.* The templateSnapshot captures the template as sent. If the user has since updated the template in the Templates library, the Re-Run uses the old version. This is correct behavior — the user is re-running what was sent, not what the template currently says. The wizard gives them the opportunity to modify before sending.

*Risk 3 — List deleted.* If the list was deleted between the original campaign and the Re-Run, `campaigns.listId` is NULL. The Re-Run URL still works; the wizard renders FileUpload in library mode but no list is pre-selected, and an amber warning explains why. The user selects a different list or switches to upload mode.

**Production readiness: High.** The backend is complete. Risks are front-end only and well-bounded.

---

### Capability 2 — CSV Export

**What it is:** `GET /api/contact-lists/:id/export` currently returns 501. M7 implements it as a CSV download of all contacts in the list.

**Customer value: High.**

Export is a baseline expectation for any contact management surface. Users need export for CRM sync, backup, compliance data requests, and sharing lists with colleagues who don't have platform access. The 501 stub is visible and jarring. Closing it is straightforward.

**Architectural assessment:**

No schema change required. The query is:
```sql
SELECT c.email, c.name, c.company, c.category
FROM contacts c
JOIN contact_list_members clm ON c.id = clm.contact_id
WHERE clm.list_id = ?
  AND c.user_id = ?
ORDER BY clm.added_at DESC
```

The response streams a CSV file. Express sets:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="[list-name].csv"
```

At current scale (< 100K rows), building the CSV string in memory from a `SELECT *` result is correct. Cursor-based streaming is the evolution path for very large lists; not needed at M7.

**Frontend:** An "Export CSV" button in `ContactListDetail.jsx` triggers a download by opening the export URL in a new tab (`window.open`) or via an anchor with `download` attribute. A `useToast` success/error message is appropriate.

**Operational simplicity:** The route is stateless and read-only. No side effects. Correct behavior under concurrent requests.

**Risks:**

*Risk 1 — Large lists and memory.* At 100K rows, a CSV string in memory at the server is ~10–15 MB. At current Railway memory allocation, this is manageable. The risk threshold is approximately 500K rows; at that point, a streaming response (piping a DB cursor) should replace the in-memory approach. This is a future evolution, not an M7 blocker.

*Risk 2 — Special characters in CSV.* Contact names and company names may contain commas and double-quotes. Standard CSV escaping (`"` → `""` within a quoted field) must be applied. Node.js's `csv-stringify` package or a manual implementation handles this. Using a library is preferred — CSV quoting edge cases are well-known traps.

**Production readiness: High.** No schema change. No external dependencies beyond a CSV formatting utility.

---

### Capability 3 — saveToLibraryAs Confirmation

**What it is:** Currently, when a user checks "Save to library as [name]" during campaign creation, the list save runs fire-and-forget. If it fails, the user never knows. M7 changes this to a synchronous save and returns `libraryListId` in the campaign creation response.

**Customer value: Medium.**

Users who tick "Save to library" expect the list to be saved. Silent failure violates that expectation. The fix is small and corrects an honesty gap in the current UX.

**Architectural assessment:**

The change is contained to `POST /api/campaigns` in `routes.js`:

```javascript
// Before (fire-and-forget):
if (saveToLibraryAs) {
  storage.createContactList(...)
    .then(list => storage.importContactsToList(...))
    .catch(err => console.error(...));
}
return res.status(201).json({ ... });

// After (synchronous with result):
let libraryListId = null;
if (saveToLibraryAs) {
  try {
    const list = await storage.createContactList(...);
    await storage.importContactsToList(...);
    libraryListId = list.id;
  } catch (err) {
    console.error("[CONTACTS] saveToLibraryAs failed:", err.message);
    // libraryListId remains null — non-fatal, campaign was already created
  }
}
return res.status(201).json({ ..., libraryListId });
```

Campaign creation remains non-fatal for library save failure. The difference is: the save now completes (or fails) before the response is returned, and the caller receives `libraryListId: null | uuid`.

**Frontend impact:** `CampaignConfirmation.jsx` currently ignores the campaign creation response beyond extracting the campaign ID. M7 adds a success toast if `libraryListId` is returned: "Contacts saved to library as '[name]'", and the query cache for `/api/contact-lists` is invalidated so the new list appears immediately in ContactLibrary.

**Latency consideration:** The library save is now synchronous and adds latency to the campaign creation response. At current contact volumes (< 10K per upload), the additional latency is < 2 seconds. This is acceptable. If future uploads regularly exceed 50K contacts, the save should become async again — but by that point, the async import architecture (M8+) will exist anyway.

**Production readiness: High.** Contained route change. Response is additive (new field; existing clients ignore it).

---

### Capability 4 — Contact Edit UI

**What it is:** Each contact row in `ContactListDetail.jsx` gains an "Edit" button that opens a sheet pre-filled with the contact's current name, company, and category. On save, `PATCH /api/contacts/:id` is called.

**Customer value: Medium.**

The API exists (`PATCH /api/contacts/:id` was implemented in M6). Without a UI, it is inaccessible to users. Contacts inevitably contain errors or go stale — names misspelled at import, companies that rebrand. Without in-place editing, users must remove and re-add the contact.

**Architectural assessment:**

Frontend-only. No backend change. No schema change.

The edit sheet is a standard pattern already used in the codebase (ContactLibrary's create/rename dialogs). The fields are: name (text), company (text), category (text). Email is displayed as read-only with a note that it cannot be changed (per the immutability principle). `customFields` is out of scope for M7 (no designed UI for arbitrary key-value pairs).

The mutation uses React Query `useMutation` → `PATCH /api/contacts/:id` → invalidate `["/api/contact-lists/:id/contacts"]`. The confirmation mutation result updates the row in place without a full table refetch (optimistic update is optional but welcome).

**Risk:** None significant. This is a routine CRUD UI operation on an existing API.

**Production readiness: High.** API already exists and is production-verified.

---

### Capability 5 — Empty List Campaign Error (M6-001)

**What it is:** When `POST /api/campaigns` is called with a `listId` that resolves to zero contacts, the current error message is "No valid contacts remain after filtering" — identical to the error shown when a user uploads a CSV with only invalid emails. M7 returns a distinct message for the empty-list case.

**Customer value: Low (but trivial to implement).**

The user who sees this error on a list-based campaign will be confused: they didn't filter anything. A message of "Contact list is empty — add contacts to this list before launching a campaign" is immediately actionable.

**Architectural assessment:**

One conditional in `server/routes.js`, in the `listId` resolution block:

```javascript
if (listId) {
  const listContactIds = await storage.resolveListContactIds(listId, req.user.id);
  if (listContactIds.length === 0) {
    return res.status(400).json({
      error: "EMPTY_LIST",
      message: "Contact list is empty — add contacts to this list before launching a campaign"
    });
  }
  // ... rest of resolution
}
```

No schema change. No storage change. No frontend change required (the error message propagates to the existing error display in CampaignConfirmation).

**Production readiness: High. Risk: None.**

---

## Capabilities Evaluated and Excluded from M7

### Contact Bulk Edit

**Excluded.** Bulk field editing (update name/company for multiple contacts simultaneously) requires a selection model in the contacts table UI that does not currently exist. The per-row edit (Capability 4) delivers 80% of the value with 10% of the complexity. Bulk edit belongs in M8 alongside the contact management expansion.

### Suppression Check Preview at List Level

**Not needed.** Evaluated and found that the existing implementation already handles this correctly. `getPreCampaignSuppressionCount` is called on `validContacts.map(c => c.email)` in the library path (validContacts is resolved via `resolveListContactIds` → `getContactsByIds`). The suppression count is already shown in CampaignConfirmation for library-mode campaigns. No change required.

### Async Import / Progress Signal

**Excluded.** Synchronous import is correct for current scale. Async import belongs in M8+ when user feedback confirms that large imports are a pain point. Implementing it prematurely adds a BullMQ job type, a progress endpoint, client-side polling, and a new UI state — all before anyone has complained about import latency.

### Segmentation

**Excluded.** Segmentation requires product design (what filter criteria are supported? how is the UI expressed?) that has not been defined. It is not an M7 scope item.

### Campaign Re-Run for Upload-Path Campaigns ("Template Re-Use")

**Clarification, not exclusion.** Re-Run is available for all COMPLETED campaigns. For upload-path campaigns (no listSnapshot), the wizard opens with the template pre-filled but no list. The user selects a list or uploads contacts. The Re-Run button text could read "Reuse Template" for upload-path campaigns to set correct expectations — this is a UI label decision for the Engineering Design phase.

---

## Architectural Questions for M7

**Q: Does Campaign Re-Run require a new API endpoint?**

No. `POST /api/campaigns` with `listId` is the Re-Run backend. `GET /api/campaigns/:id` provides the source campaign data. Zero new routes.

**Q: Does the `CampaignProvider` initialState prop change break any existing consumer?**

No. The prop is optional (`initialState ?? INITIAL_STATE`). All existing uses of `CampaignProvider` (only `NewCampaign.jsx`) pass no props and are unaffected.

**Q: Does making `saveToLibraryAs` synchronous create a timeout risk on Railway?**

At current contact volumes (< 10K on `saveToLibraryAs`), the library save takes < 2 seconds. Railway's default request timeout is 60 seconds. No risk at M7 scale. Document the threshold in the Engineering Design.

**Q: Does CSV Export require a new npm dependency?**

Recommended: yes, `csv-stringify` or equivalent. CSV quoting edge cases (embedded quotes, newlines in names) are a trap for hand-rolled implementations. A 3KB library eliminates an entire class of subtle data corruption bugs. The dependency is trivial to justify.

**Q: Does Re-Run's URL param approach (`?rerun=campaignId`) conflict with any existing route?**

No. `/app/campaigns/new` currently renders `NewCampaign` with no URL param handling. The `?rerun` param is additive and ignored by all current code paths.

**Q: Should Re-Run be restricted to campaigns the user owns?**

Yes, and this is already enforced: `GET /api/campaigns/:id` is behind `authMiddleware` and returns only campaigns owned by the requesting user (or all campaigns for ROOT_ADMIN). The derived initial state comes from data the user is already authorized to see. No additional authorization logic is required.

---

## Scope Decision

**M7 scope is approved as follows:**

| # | Capability | Priority | Complexity | Backend change | Frontend change |
|---|---|---|---|---|---|
| 1 | Campaign Re-Run | High | Medium | None (uses existing POST /api/campaigns + GET /api/campaigns/:id) | CampaignProvider, NewCampaign, FileUpload, History |
| 2 | CSV Export | High | Low | 1 new route (closes 501 stub) | Export button in ContactListDetail |
| 3 | saveToLibraryAs confirmation | Medium | Low | Route change only | Toast + cache invalidation |
| 4 | Contact Edit UI | Medium | Low | None (API exists) | Edit sheet in ContactListDetail |
| 5 | Empty list error | Low | Trivial | 3-line route change | None |

All five capabilities are in scope. Implementation should proceed in order of risk, not priority:

**Implementation sequence:**
1. Empty list error (zero risk; warm-up)
2. CSV Export (isolated; backend + one frontend component)
3. saveToLibraryAs confirmation (route change; tests campaign creation response)
4. Contact Edit UI (frontend-only; isolated component)
5. Campaign Re-Run (most complex; touches CampaignContext, NewCampaign, FileUpload, History)

Campaign Re-Run is last because it touches the most components and its correctness depends on understanding the full wizard flow. The earlier items are warm-up and parallel-safe.

---

## Migration Requirements

**None.** M7 requires zero database schema changes. All five capabilities are implemented in existing tables with existing columns. The only new file is a minor schema/route change for export and one small UI component for contact edit. This is the expected characteristic of a "completion layer" milestone: M6 built the foundation; M7 builds on it without touching it.

---

## Engineering Design Readiness Checklist

Before Engineering Design begins, confirm:

- [ ] This review is approved
- [x] `GET /api/campaigns/:id` returns `templateSnapshot`, `listId`, `listSnapshot`, `name` — confirmed: `getCampaign()` uses `db.select().from(campaigns)` (all columns); no route change needed
- [ ] `csv-stringify` package or equivalent approved for CSV export
- [ ] History campaign detail modal has been reviewed (the component that will receive the Re-Run button)
- [ ] Re-Run URL scheme confirmed: `/app/campaigns/new?rerun=<campaignId>`

---

## Milestone Boundary

**In scope for M7:**
- Campaign Re-Run (all COMPLETED campaigns; template + list pre-fill)
- CSV Export (streaming response; closing M6-003)
- saveToLibraryAs confirmation (libraryListId in response; closing M6-002)
- Contact Edit UI (name/company/category; uses existing PATCH /api/contacts/:id)
- Empty list error distinction (closing M6-001)

**Out of scope for M7 (explicitly deferred):**
- Async import / progress signal (M8+)
- Segmentation (product design phase required)
- Contact tags (overlaps with segmentation)
- Bulk contact edit (M8+)
- Duplicate contact detection / merge (M8+)
- List sharing / team access (post-team milestone)
- Contact scoring (M9+)
- Sequences / drip campaigns (automation milestone)
- API import endpoint (M8+)
- Advanced search (GIN trigram index) (performance milestone)
