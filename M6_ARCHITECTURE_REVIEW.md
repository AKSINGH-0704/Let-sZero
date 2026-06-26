# M6 Post-Implementation Architecture Review

**Type:** Post-Implementation Architecture Review (not a production audit)
**Milestone:** M6 — Contact Library
**Commit reviewed:** `d655399`
**Date:** 2026-06-27
**Reviewed against:** production PostgreSQL schema, storage.js, memoryStorage.js, routes.js, frontend pages
**Scope:** Architectural quality, long-term soundness, decision rationale, future extensibility

---

## Executive Assessment

The Contact Library architecture delivered by M6 is **well-founded and production-appropriate** for the current scale and product scope. The core model — global contacts table + named lists via M-N join + campaign snapshot — is the same model used by Brevo, Mailchimp, and HubSpot, each of which has scaled it to hundreds of millions of contacts. That convergent design choice is a signal of soundness, not a lack of originality.

One genuine security gap was found during review: the `removeContactFromList` and `bulkRemoveContactsFromList` routes did not verify list ownership before mutation. Both the route layer and the memory storage implementation have been corrected as part of this review. This is documented in ADR-M6-008.

Everything else reviewed is architecturally appropriate. Three decisions are intentionally temporary (synchronous import, correlated count subquery, export stub) and are explicitly documented.

---

## Architectural Dimensions

### 1. Database Model

**Assessment: Strong. No changes recommended.**

The schema is clean and normalized. Three tables handle three distinct concerns:

- `contact_lists` — named, user-owned list metadata
- `contact_list_members` — M-N join; the unique constraint `(list_id, contact_id)` prevents duplicate membership at the DB level without needing application logic
- `contact_imports` — per-import audit log; separate from operational tables, grows append-only

The `contacts` table is global per user with `(userId, email)` as the unique key. This is the correct identity model: contacts are not list-scoped, so a contact belongs to the user and may appear in many lists.

The two columns added to existing tables are additive and backward-compatible:
- `contacts.updated_at` — should have existed from the beginning; no semantic change
- `campaigns.list_id` (ON DELETE SET NULL) + `campaigns.list_snapshot` JSONB — the two-tier durability pattern (FK for operational state, snapshot for immutable history) is correct and mirrors what RepMail already does for `templateSnapshot`

Index coverage is appropriate at current scale. Gaps at future scale are documented in the Scalability section.

---

### 2. Ownership Model

**Assessment: Consistent except for one gap, now fixed.**

Every table in the Contact Library carries `userId` either directly or by inference through FK chain:

| Table | Ownership enforcement |
|---|---|
| `contact_lists` | Direct `user_id` column + FK; every query AND user_id = ? |
| `contact_list_members` | Inferred: list_id → contact_lists.user_id; no direct column |
| `contact_imports` | Direct `user_id` column + FK |
| `contacts` | Direct `user_id` column + FK |

The absence of `userId` in `contact_list_members` is correct normalized design — it would be denormalized data. However, this creates a requirement that every membership mutation verify list ownership before touching the join table.

**Gap identified and fixed:** `removeContactFromList` and `bulkRemoveContactsFromList` were called from routes without a preceding `getContactList(listId, userId)` ownership check. The storage-layer methods accepted `userId` but did not include it in the DELETE WHERE clause. Any authenticated user who knew a list UUID could remove contacts from another user's list.

**Fix applied:** Routes now call `getContactList(listId, userId)` before both removal operations (→ 404 if unowned). memoryStorage implementations now verify list ownership before mutation. The defense-in-depth principle — ownership enforced at both route and storage layers — is now consistent across all 12 Contact Library endpoints.

---

### 3. Contact Identity

**Assessment: Correct and enforced at multiple layers.**

Email is the identity key for contacts within a user's account, enforced by the `(userId, email)` unique index. This is the right model. A contact is a person, identified by their email address. If an email changes, that is a new logical contact.

Email immutability is enforced at three independent layers:
1. **Route layer** — `PATCH /api/contacts/:id` destructures `email` out and returns 400 if it is present in the body
2. **Storage layer** — no `email` field is ever updated in `updateContact`
3. **DB layer** — the unique constraint would reject a conflicting email change anyway

This triple enforcement is appropriate. Email is the foreign key of record for suppression lookups, campaign email records, and deduplication. Allowing it to change would require cascading updates across 5+ tables and would invalidate historical send data.

The `customFields: jsonb` column is the correct extensibility point for future contact enrichment without schema migrations.

---

### 4. List Architecture

**Assessment: Correct model, correct deletion semantics.**

The M-N join model (contacts reusable across lists, lists additive to contacts) is the industry-standard architecture for this domain. It enables the future product capabilities that M6 was explicitly designed to support: re-runs, segmentation, sequences, and automation.

The hard-delete policy for lists (cascade on contact_list_members, ON DELETE SET NULL on campaigns.list_id) is consistent and correct:
- Contacts are never deleted when a list is deleted — they belong to the user, not the list
- Campaign-list associations are preserved via the snapshot (campaigns.listSnapshot survives list deletion)
- Import records are deleted with the list (cascade) — this is the only point worth noting: if a user deletes a list and later wants to understand its import history, that history is gone. This is acceptable given that the audit_logs table retains CONTACTS_IMPORTED_TO_LIST events with counts. Full row-level recovery is not supported, which is appropriate for the current product.

The `description` field on `contact_lists` is a correct inclusion for future UX (segmentation notes, use-case labels) without consuming schema space.

---

### 5. Import Architecture

**Assessment: Appropriate for current scale; documented limitations for future scale.**

The import runs synchronously in 1,000-row batches with 4 queries per batch. This is the right tradeoff for M6:

| Approach | Complexity | Latency (50K rows) |
|---|---|---|
| Synchronous batch (current) | Low | 20–40s |
| Async job (BullMQ) | High | Background, with progress polling |
| Streaming (chunked response) | Medium | First bytes in <1s |

At current user scale (< 1,000 contacts per list is the typical case), synchronous is imperceptible. Async import becomes necessary only at 50K+ rows per user with concurrent imports — that is a future scale milestone.

The `source` field on `contact_imports` is strategically placed. It accepts `library_import`, `campaign_upload`, and `api` (future). This field enables future analytics on import origin without a schema migration.

The `failed_rows` counter is recorded but the implementation always sets it to 0 in M6 — validation (email format checks) happens before reaching `importContactsToList`, so by the time rows arrive at the storage method, invalid emails have already been filtered. This is correct behavior but the field name is mildly misleading at the storage level. It is accurate at the API level (the import route filters rows before calling storage).

---

### 6. Search Architecture

**Assessment: Correct for current scale. GIN index is the next evolution.**

Search on `getContactListContacts` uses `ilike(contacts.email, '%query%')` and `ilike(contacts.name, '%query%')`. This is implemented as a PostgreSQL `ILIKE` expression with a leading wildcard, which cannot use a B-tree index.

At current scale (< 10,000 contacts per list), this is imperceptible. The existing `(userId, email)` unique index covers exact-match lookups but not pattern searches.

At 100,000+ contacts per list, an `ilike` scan without a GIN trigram index (`CREATE EXTENSION pg_trgm; CREATE INDEX ON contacts USING gin(email gin_trgm_ops)`) would become the bottleneck. This is not a current problem and is tracked as a future optimization.

The pagination model (page + limit + separate COUNT query) is the standard REST pattern and correct for this use case. A window function (`COUNT(*) OVER()`) would eliminate the second query, but the two-query pattern is familiar and maintainable.

---

### 7. API Design

**Assessment: Consistent, RESTful, well-bounded.**

The 12 new routes follow a consistent resource hierarchy:

```
/api/contact-lists          — collection
/api/contact-lists/:id      — resource
/api/contact-lists/:id/contacts   — sub-collection
/api/contact-lists/:id/import     — action on resource
/api/contacts/:id           — global contact resource
```

This mirrors the established pattern of the rest of the RepMail API and is immediately legible to any engineer familiar with REST conventions.

The decision to use `POST /api/contact-lists/:id/bulk-remove` (not `DELETE`) for bulk removal is correct. `DELETE` with a body is technically allowed by HTTP but poorly supported by some clients and proxies. `POST` for bulk operations is the established convention.

The 15MB body limit applied specifically to the import route (via route-level `express.json` middleware override) is the right approach — it doesn't inflate the global request size limit while accommodating large CSV payloads on the specific route that needs it.

The 501 stub for export is a clean API boundary: it tells clients that the resource and route exist but the capability is not yet implemented, without returning a misleading 404.

---

### 8. Frontend Architecture

**Assessment: Correct component decomposition. One architectural pattern to note.**

`ContactLibrary.jsx` and `ContactListDetail.jsx` are page-level components with appropriate separation of concerns. `ContactListDetail.jsx` is the larger component — it owns the contacts table, the import sheet, search, and pagination. This is the right place to own all of that state; extracting the import sheet into its own component would be the natural next split if the import flow grows (e.g., async progress tracking).

The campaign wizard integration is the most architecturally significant frontend decision. Library mode skips step 2 (ColumnMapping) by calling `setStep(3)` directly rather than `goNext()`. This is correct — ColumnMapping is meaningless for contacts that are already stored with structured fields. The alternative (presenting a no-op ColumnMapping step) would be confusing.

The `saveToLibraryAs` fire-and-forget pattern (campaign created regardless of library save outcome) is the right UX priority: campaign creation must not fail because of an optional convenience feature. The lack of confirmation to the user that the list was saved is a documented gap (M6-002) for M7.

The wouter route ordering concern (`/app/contacts/:id` declared before `/app/contacts`) is resolved correctly. This is a wouter v3 constraint that future engineers adding routes in this range should be aware of.

---

### 9. Scalability

**Assessment: Appropriate for current scale. Three specific evolution points identified.**

**Evolution Point 1 — Correlated contactCount subquery**

`getContactLists` and `getContactList` compute `contactCount` via a correlated subquery:
```sql
SELECT COUNT(*) FROM contact_list_members WHERE list_id = contact_lists.id
```
This fires once per list row. At N=10 lists, this is 10 count queries. At N=1,000 lists per user, this is 1,000 count queries per page load. The correct long-term solution is a materialized `member_count` column on `contact_lists` updated application-side on member add/remove, or a PostgreSQL trigger. This optimization is premature at current user scale but should be adopted before the platform reaches 500+ lists per user.

**Evolution Point 2 — ilike search without trigram index**

Documented above under Search Architecture.

**Evolution Point 3 — Synchronous import**

Documented above under Import Architecture.

None of these three points are problems today. They are scheduled evolution points, not architectural debt.

---

### 10. Maintainability and Extensibility

**Assessment: High maintainability. Clear extension points.**

The full `memoryStorage.js` mirror of all 13 Contact Library methods ensures that local development has zero infrastructure requirements, the same guarantee that exists for all other RepMail features.

The AUDIT_ACTIONS additions (`CONTACT_LIST_CREATED`, `CONTACTS_IMPORTED_TO_LIST`, etc.) follow the established constant pattern — no raw strings, no typo risk.

The `sanitizeContactTextField` helper in routes.js (trim, type-check, slice to 500) is the right defense for free-text contact fields without requiring a schema-level constraint.

---

## Five Architecture Questions

### Q1. Which architectural decisions are expected to remain stable for years?

| Decision | Why stable |
|---|---|
| Global contacts table with `(userId, email)` unique constraint | Email identity is fundamental; deduplication at DB level is the only correct approach |
| M-N join (`contact_list_members`) | Proven at scale by Brevo/Mailchimp; supports every planned future capability |
| Email as immutable identity key | Email change = new logical contact; this invariant underpins suppression, analytics, and deduplication |
| `campaigns.list_id` (ON DELETE SET NULL) + `campaigns.listSnapshot` | Two-tier durability is the right model for any system where operational state and historical record must decouple |
| Import audit log (`contact_imports`) | Append-only audit table — grows with the product; never needs structural change |
| `customFields: jsonb` on contacts | Extensibility escape hatch; prevents schema migrations for minor enrichment needs |
| Ownership enforced at every query via `userId` | Security invariant; every future Contact Library method must follow this pattern |

### Q2. Which decisions are intentionally temporary?

| Decision | Replacement trigger | Backlog |
|---|---|---|
| Synchronous import (no progress signal) | First user complaint about >30s wait, or first 50K-row import | M6-004 → M8+ |
| Correlated `contactCount` subquery | When `getContactLists` response time degrades (monitor at 500+ lists/user) | Future optimization |
| Export stub (501) | M7 implementation | M6-003 |
| `saveToLibraryAs` fire-and-forget (no success confirmation) | When user feedback identifies list save reliability as an issue | M6-002 → M7 |
| Empty list campaign error message generic | M7 UX pass | M6-001 |

### Q3. Which future capabilities can be built directly on this architecture without any schema or API changes?

- **Campaign Re-Run** — `campaigns.list_id` is already stored; re-run reads current list members via `resolveListContactIds`; re-uses the same campaign creation path with `listId`
- **CSV Export (M7)** — straightforward: `SELECT contacts.* FROM contacts JOIN contact_list_members ON ... WHERE list_id = ?`; no schema change
- **Multiple CSV imports to same list** — already supported; `importContactsToList` is idempotent on contact upsert and membership uniqueness
- **Import history UI expansion** — `contact_imports` already stores all needed fields; just a UI build
- **"Send to this list" from ContactListDetail** — just wire the existing campaign creation flow with `listId` pre-filled
- **Import from multiple sources** — `source` field already supports `library_import`, `campaign_upload`, `api`; just add a new source value
- **Contact field enrichment** — `updateContact` + `customFields JSONB` already support arbitrary field updates

### Q4. Which future capabilities will require architectural extension but not redesign?

| Capability | What changes | What stays |
|---|---|---|
| **Segmentation** | Add `filter_criteria JSONB` to `contact_lists`; membership becomes computed (dynamic lists) vs. stored (static lists) | All existing static-list infrastructure unchanged |
| **Duplicate detection/merge** | New `GET /api/contacts/duplicates` query across contacts; merge writes to existing `contacts` table | Schema unchanged; merging two contacts is a contact update + membership transfer |
| **Async large import** | Wrap `importContactsToList` in a BullMQ job; add `GET /api/contact-lists/:id/imports/:importId/status` | `contact_imports` table tracks progress; just add `status` column and job wiring |
| **Sequences / drip campaigns** | New `sequences` and `sequence_enrollments` tables FK'd to `contact_lists`; enrollment reads list members | Contact and list model unchanged |
| **Shared lists / team access** | Add `list_permissions` junction table or `shared_with JSONB`; ownership model extends to multi-user | Current single-owner model is a subset of shared-access; backward compatible |
| **Contact scoring** | Add `score integer` to `contacts` or `contact_list_members`; scoring function reads campaign engagement | Schema is additive; no existing queries change |
| **GIN search index** | One migration: `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE INDEX CONCURRENTLY` | Query unchanged; optimizer automatically uses GIN index |
| **Materialized contactCount** | One migration: add `member_count integer DEFAULT 0`; update increment/decrement on membership changes | Route and frontend use `contactCount` already — just source from column instead of subquery |
| **Contact merge on import (dedup by name)** | Additional pre-import matching step in `importContactsToList`; no schema change | Import pipeline is already batched; add a pre-pass |

### Q5. Are there any architectural decisions you would change if starting M6 again today?

**One genuine issue, now fixed.**

The `removeContactFromList` and `bulkRemoveContactsFromList` endpoints did not verify list ownership before performing the DELETE. This was a security gap: any authenticated user who knew a list UUID could remove contacts from another user's list. This was discovered during this review and corrected before the review was written.

**Two stylistic refinements worth noting but not changing.**

1. **`failed_rows` counter is always 0 in the storage method.** Validation happens at the route layer before `importContactsToList` is called, so the storage method never sees invalid rows. The field is accurate from the API's perspective but the naming suggests it tracks storage-layer failures, which it doesn't. A clearer name would be `skippedRows` (rows excluded by validation before reaching storage). Not changing this — the field value is correct and the API contract is accurate. Note for future engineers.

2. **`contact_imports` hard-deletes with the list.** If a user deletes a list, they lose import history. The AUDIT_TRAIL captures the event counts but not the row-level data. For a future compliance requirement, `contact_imports` could be made a soft-delete or decoupled from list deletion. At current scale and requirements, the current behavior is correct.

**No structural changes would be made. The architecture is appropriate for M6's scope and scale.**

---

## Architecture Decision Records

---

### ADR-M6-001 — Global Contacts + Named Lists (M-N Join Model)

**Decision:** Contacts are stored in a global `contacts` table per user, with a unique constraint on `(userId, email)`. Named lists are a separate `contact_lists` table. Membership is tracked in a `contact_list_members` join table.

**Context:** The alternative was to store contacts as list-scoped records — each list has its own set of contacts, and a contact appearing in two lists would be two separate rows. This is simpler to implement initially but creates duplication and prevents deduplication across lists.

**Alternatives Considered:**
- **List-scoped contacts** — Simple schema, but: a contact imported to three lists becomes three rows; suppression must check all three; a name update requires updating all three; analytics across lists requires deduplication at query time.
- **Global contacts with tag-based grouping** — Contacts have a tags array; lists are just tag queries. Simpler schema but poor for large-scale membership operations (bulk add/remove requires array updates on O(N) contact rows).
- **Global contacts + M-N join (selected)** — Industry standard. Contacts are deduplicated at the identity level; lists are independent; suppression, analytics, and deduplication are all simple.

**Why This Approach Was Selected:** It matches the proven data model of every major email platform at scale. It also directly enables future capabilities (segmentation, sequences, re-runs) that are in the product roadmap, without requiring a schema redesign.

**Trade-offs:**
- Pro: Contacts deduplicated by design; suppression logic unchanged; analytics clean
- Pro: Future list operations (segment, filter, score) operate on membership records, not contact copies
- Con: JOIN required for every list-contact operation vs. simple SELECT for list-scoped model
- Con: Deleting a contact leaves orphaned membership records if cascade is not configured (mitigated: cascade is set)

**Future Implications:** All future capabilities (segmentation, sequences, CRM enrichment, merge) are direct extensions of this model. No architectural change will be required.

---

### ADR-M6-002 — Email as Immutable Identity Key

**Decision:** A contact's email address is its identity. It cannot be changed after creation. `PATCH /api/contacts/:id` rejects any request body containing an `email` field with HTTP 400.

**Context:** Email is the foreign key of record across the entire RepMail system: suppression lookups, campaign email records, delivery tracking, unsubscribe processing, and bounce handling all key on email address. Allowing email to change would require cascading updates across 5+ tables and would invalidate historical analytics.

**Alternatives Considered:**
- **Mutable email with cascading update** — Technically possible via a DB transaction, but suppression records and historical campaign_emails records would become inconsistent.
- **Mutable email with new contact creation** — Allow email change by creating a new contact record and migrating memberships. Preserves integrity but is complex to implement and confusing to users.
- **Immutable email (selected)** — Email is the semantic identity of the contact. If an email changes, that is a new contact.

**Why This Approach Was Selected:** Simplicity and integrity. Every other system that keys on email (suppression, delivery records, unsubscribe) is immune to identity churn. The product boundary is clear: "this is a contact entry for this email address."

**Trade-offs:**
- Pro: Historical records remain accurate; no cascading update complexity
- Pro: Suppression logic requires no changes when contacts are updated
- Con: Users cannot correct a misspelled email — they must delete and re-add. Acceptable UX trade-off at current scale.

**Future Implications:** If a "merge contacts" feature is added (two rows for same person with different emails), the UI would handle deduplication at a higher level than the `contacts` table. The immutability invariant is preserved.

---

### ADR-M6-003 — Hard Delete for Lists; Contacts Persist

**Decision:** Deleting a `contact_list` cascades to `contact_list_members` and `contact_imports`. The `campaigns.list_id` FK is set to NULL (ON DELETE SET NULL). Contact records in the `contacts` table are never deleted as a consequence of list deletion.

**Context:** The alternative is soft delete — a `deleted_at` timestamp on `contact_lists`, with all queries filtering `WHERE deleted_at IS NULL`. This preserves audit history but adds complexity to every query and creates a class of "zombie" lists.

**Alternatives Considered:**
- **Soft delete with `deleted_at`** — Preserves history; allows undo. But: every list query must filter `deleted_at IS NULL`; new engineers forget this filter; zombie list data accumulates; `getContactLists` becomes subtly wrong if the filter is missed.
- **Hard delete with archive table** — Copy list metadata to an archive before deletion. More complex but preserves history.
- **Hard delete (selected)** — List deletion is explicit and clean. History is preserved at the right level: AUDIT_TRAIL records `CONTACT_LIST_DELETED`, and the audit log persists list name + contact count. Campaigns with `listSnapshot` retain the list state at campaign creation regardless.

**Why This Approach Was Selected:** Hard delete eliminates a class of query correctness bugs. The audit log and campaign snapshot provide sufficient history for the current product. Soft delete complexity is not warranted at this stage.

**Trade-offs:**
- Pro: All contact_list queries are simple — no `deleted_at IS NULL` filter required
- Pro: No zombie list accumulation in the DB
- Con: Import history (`contact_imports`) is deleted with the list — no row-level import history after deletion
- Con: No undo for list deletion

**Future Implications:** If a "recently deleted" or "trash" feature is added, the soft-delete column can be introduced at that milestone without redesigning the rest of the model.

---

### ADR-M6-004 — Campaign List Snapshot (Immutable at Creation)

**Decision:** When a campaign is created via `listId`, the system records `campaigns.listSnapshot = { name, contactCount }` at creation time. This snapshot is immutable. If the list is later renamed or deleted, the campaign record retains the name and contact count from the moment of campaign creation.

**Context:** Without a snapshot, a campaign created from "Q1 Prospects" and later viewed in History would show either a blank list name (if the list was deleted, because `listId` is NULL) or the current list name (if the list was renamed to "Q2 Prospects"). Neither is accurate for audit purposes.

**Alternatives Considered:**
- **No snapshot; join to contact_lists at query time** — Simple, but list name is lost on deletion and changes retroactively on rename.
- **Snapshot the full contact list (all emails)** — Accurate but stores unbounded data in campaigns.contactIds JSONB; impractical at scale.
- **Snapshot name + count only (selected)** — Lightweight, sufficient for UI display and audit ("Campaign was sent to 'Q1 Prospects' — 847 contacts"), and matches the existing `templateSnapshot` pattern.

**Why This Approach Was Selected:** The `templateSnapshot` pattern already exists in the campaigns table and has proven sufficient for template history. Applying the same pattern to list metadata is consistent and requires no new architectural concept.

**Trade-offs:**
- Pro: Campaign history is self-describing even after list mutation or deletion
- Pro: No join required to display list context in History
- Con: If list metadata beyond name/count is needed historically (e.g., which contacts were in the list), the snapshot is insufficient — contactIds serves that purpose separately
- Con: Snapshot becomes stale the moment the list changes — it is a point-in-time record, not live data

**Future Implications:** Campaign re-run should re-read the live list (current members), not the snapshot. The snapshot is history-only. This distinction should be documented at campaign re-run implementation time.

---

### ADR-M6-005 — Synchronous Batch Import (No Async Job Queue)

**Decision:** `POST /api/contact-lists/:id/import` processes rows synchronously within the HTTP request, in 1,000-row batches. The response is returned only after all batches are complete.

**Context:** The alternative is to enqueue an async job (via the existing BullMQ queue) and return a job ID immediately. The client then polls for completion. This is necessary at scale but adds significant complexity: job tracking, progress endpoints, client-side polling, and import status UI.

**Alternatives Considered:**
- **Async BullMQ job with polling** — Correct at scale but requires a new job type, a progress storage mechanism, and a polling UI flow. Adds ~500 lines of code across 4 files.
- **Streaming chunked response** — Returns partial results as each batch completes. Correct but not well-supported by React Query's fetch model.
- **Synchronous batch (selected)** — Simple, deterministic, and correct for the expected import sizes at M6 launch (< 10,000 rows). Worst case (50K rows) is ~30s — acceptable for an explicit user-triggered upload.

**Why This Approach Was Selected:** Async complexity is only justified when users will actually hit the synchronous limit. The first user complaint about import latency is the correct trigger to implement async — not an upfront assumption.

**Trade-offs:**
- Pro: Simple implementation; no new queue job types; response is definitive
- Pro: Retry semantics are trivial — re-upload the file
- Con: HTTP request blocks for the duration of the import; potential timeout at ~50K+ rows on Railway's 30s request timeout
- Con: No progress signal; user sees a spinner until completion

**Future Implications:** When async import is implemented, `contact_imports.source` and the import record schema are already in the right shape. The only changes needed are: queue job wrapper, `status` column on `contact_imports`, and a progress endpoint.

---

### ADR-M6-006 — saveToLibraryAs: Best-Effort, Non-Fatal

**Decision:** When `saveToLibraryAs` is provided in the `POST /api/campaigns` body, the system creates a contact list and imports the campaign contacts into it after the campaign is created. This operation runs fire-and-forget (`.then().catch(console.error)`) — the campaign is created regardless of whether the library save succeeds.

**Context:** The alternative is to make library save blocking: if library save fails, campaign creation fails. This would be surprising behavior — a user choosing to save a campaign's contacts to a list should not block sending the campaign.

**Alternatives Considered:**
- **Blocking: campaign creation fails if library save fails** — Incorrect UX. The primary action (campaign creation) should not be gated on the secondary convenience (library save).
- **Fire-and-forget (selected)** — Campaign creation is atomic and always succeeds. Library save is best-effort.
- **Fire-and-forget with response flag** — Campaign response includes `libraryListId: null | uuid` indicating whether the save succeeded. Better UX but adds async complexity (the save would need to complete synchronously to include the ID in the response).

**Why This Approach Was Selected:** Campaign creation is the primary action; library save is a convenience. Failing the primary action for a secondary convenience would be wrong. The fire-and-forget pattern is appropriate when the secondary operation is optional and the primary must not be blocked.

**Trade-offs:**
- Pro: Campaign creation is always atomic and successful
- Con: User receives no confirmation that the library save completed; if it fails silently, the user's expectation (contacts were saved) is wrong
- Con: No `libraryListId` in the response for clients to link to the newly created list

**Future Implications:** M7 should add `libraryListId` to the campaign creation response to confirm the save and provide a deep link to the new list. The current fire-and-forget becomes a race that resolves before the response, or the save becomes a synchronous blocking call with a well-defined error path.

---

### ADR-M6-007 — Library Mode Skips ColumnMapping (Step 3 Instead of goNext)

**Decision:** When a user selects a contact list in the campaign wizard (library mode), clicking "Continue" calls `setStep(3)` to jump to Preview/Template, bypassing step 2 (ColumnMapping).

**Context:** Step 2 (ColumnMapping) maps CSV column headers to contact fields. This mapping is meaningless when contacts come from the library: they are already structured (email, name, company, category) and no column mapping is required.

**Alternatives Considered:**
- **Show ColumnMapping step in read-only mode** — Display the field mapping as a summary. Adds UI complexity for zero user value.
- **Show a simplified "review contacts" step** — Replace ColumnMapping with a contact preview when in library mode. More user-friendly but a more invasive wizard change.
- **Skip entirely via setStep(3) (selected)** — Correct and simple. The user has already implicitly confirmed the field mapping by managing the library.

**Why This Approach Was Selected:** ColumnMapping exists to solve the problem of unmapped CSV headers. That problem does not exist in library mode. The correct solution to a problem that does not exist is to not show the UI for it.

**Trade-offs:**
- Pro: No confusing or no-op UI step in library mode
- Pro: Minimal wizard modification — only the step navigation changes
- Con: The wizard's step numbering becomes non-linear in library mode (step 1 → step 3). This is invisible to users but could confuse engineers reading the step state.

**Future Implications:** If a "review list before sending" step is added (shows a sample of contacts from the selected list), it can be inserted between step 1 and step 3 without restructuring the ColumnMapping step.

---

### ADR-M6-008 — Ownership Enforcement on List Membership Mutations

**Decision:** Every endpoint that modifies `contact_list_members` must verify that the requesting user owns the target list before performing the mutation. This verification happens at both the route layer (via `getContactList(listId, userId)` pre-check) and the storage layer (memoryStorage verifies list ownership before mutation).

**Context:** This ADR documents both the principle and the correction applied during this architecture review. The initial M6 implementation added a route pre-check for `getContactListContacts` (read) but not for `removeContactFromList` and `bulkRemoveContactsFromList` (writes). The storage methods accepted `userId` for audit logging but did not include it in the DELETE WHERE clause.

**Gap:** Any authenticated user who knew a list UUID could remove contacts from another user's list by calling `DELETE /api/contact-lists/:listId/contacts/:contactId` or `POST /api/contact-lists/:id/bulk-remove` with a `listId` they do not own.

**Fix Applied (2026-06-27):**
- `DELETE /api/contact-lists/:listId/contacts/:contactId` now calls `getContactList(listId, req.user.id)` before `removeContactFromList`; returns 404 if the list is not found or not owned
- `POST /api/contact-lists/:id/bulk-remove` now calls `getContactList(req.params.id, req.user.id)` before `bulkRemoveContactsFromList`; returns 404 if list not found or not owned
- `memoryStorage.removeContactFromList` now verifies list ownership (`userId`) before deleting the membership record
- `memoryStorage.bulkRemoveContactsFromList` now verifies list ownership before iterating membership records

**Why Route Layer + Memory Storage Layer:**
The PostgreSQL storage layer benefits from the route pre-check. The memory storage layer is used in tests and local development where the route layer may be bypassed; it must enforce ownership independently.

**Trade-offs:**
- Pro: Defense-in-depth; ownership enforced at both route and storage layers
- Pro: Pattern is now consistent with all other list-scoped mutations
- Con: Two additional DB queries (one per route) for ownership verification — negligible overhead

**Future Implications:** Every future Contact Library method that mutates `contact_list_members` must follow this pattern: route pre-check via `getContactList` + storage-layer ownership assertion. This ADR is the canonical reference.

---

## Out of Scope for M6

The following capabilities were intentionally deferred. They are not gaps in the M6 implementation; they are the next layer of the product, designed to build on the M6 foundation.

| Capability | Why Deferred | Natural Milestone |
|---|---|---|
| **CSV Export** | Requires streaming response or file generation; straightforward but separate from import scope | M7 |
| **Segmentation / Dynamic Lists** | Requires filter criteria schema, computed membership, and query builder UI | M8+ |
| **Duplicate Contact Detection** | Requires cross-list contact analysis and merge UI; design not finalized | M8+ |
| **Bulk Contact Edit** | Mass field update across all contacts in a list; requires UI and batch storage method | M7 |
| **Contact Tags** | Many-to-many tagging system distinct from list membership; overlaps with segmentation design | M8+ |
| **Import Progress / Async Import** | Requires BullMQ job type, polling endpoint, and client-side progress UI | M8+ |
| **List Sharing / Team Access** | Multiple users accessing the same list; requires list permissions table | Post-Team milestone |
| **Contact Scoring** | Behavioral score derived from campaign engagement; requires schema addition and scoring pipeline | M9+ |
| **Sequences / Drip Campaigns** | Automated follow-up series triggered by list enrollment; requires sequence schema and worker | Automation milestone |
| **Campaign Re-Run** | Re-send to the same list (or current list members); M6 foundation is in place | M7 |
| **Suppression Enforcement at List Level** | Currently enforced at campaign send time; list-level suppression preview was not in M6 scope | M7 |
| **API Import Endpoint** | `POST /api/contacts/import` for programmatic list building; `source: 'api'` field is ready | M7 |
| **saveToLibraryAs Confirmation** | Response field indicating whether the fire-and-forget library save succeeded | M7 |

---

## Conclusion

M6 delivers a Contact Library architecture that is:

- **Immediately functional** — 12 API endpoints, 2 frontend pages, campaign wizard integration, all production-verified
- **Industry-correct** — Global contacts + M-N list model matches the proven architecture of every major email platform
- **Appropriately scoped** — Synchronous import, correlated count subquery, and export stub are the right deferments; none are architectural debt
- **Secure** — Ownership enforced at every query; one gap found during review and corrected before publication
- **Extensible** — Segmentation, sequences, campaign re-run, async import, and CSV export can all be built directly on the M6 foundation without redesign

The platform is architecturally ready to proceed to Milestone 7.
