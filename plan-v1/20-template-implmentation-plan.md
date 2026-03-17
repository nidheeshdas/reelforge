# Next Development Plan: Template Lifecycle and Seed Outcome Packs

## Problem and approach
The current product plan establishes a broad path for ReelForge, but the highest-value next milestone is to make templates a real end-to-end product surface. The repository already contains the right foundations: a `Template` Prisma model, placeholder extraction in the parser, editor-side import behavior, and placeholder template pages that are still hardcoded. The next increment should convert those foundations into a complete lifecycle: save a VidScript as a template, manage it under account, publish it publicly, browse it in a DB-backed library, and use it to re-enter the editor.

This milestone is the right next step because it turns generated scripts into reusable product assets, unlocks a credible free template library, and creates the base needed for later marketplace, outcome-pack, and plugin work without requiring risky parser or renderer rewrites.

## Why this milestone now
- The existing product plan prioritizes template save and publish flows as the nearest monetizable and retention-oriented capability.
- The repository already has a `Template` model and parser placeholder extraction, so this is an execution milestone, not a research project.
- Public template pages under `src/app/templates` are still using hardcoded content, which means the UX surface exists but the real data path does not.
- The editor already supports imported VidScript via local storage, so template usage can reuse that mechanism instead of introducing a new transport path.
- Shipping seed outcome packs alongside the lifecycle ensures the template system is valuable immediately rather than feeling empty after implementation.

## Goals
1. Let authenticated users save a VidScript from `/editor` as a reusable template.
2. Let users manage template metadata and visibility from `/account`.
3. Let users publish templates into a free public library.
4. Replace hardcoded template gallery and detail pages with database-backed implementations.
5. Seed the library with outcome-oriented starter templates that demonstrate real use cases.
6. Keep the implementation consistent with the current Next.js App Router, Prisma, and Playwright-based validation workflow.

## Non-goals
- Paid marketplace flows, transactions, or creator payouts.
- Ratings, comments, reviews, or social discovery mechanics.
- New VidScript DSL features such as plugin imports.
- Shader authoring/import tooling beyond using existing scripts/templates.
- Automatic thumbnail generation or media asset pipelines.
- Rich placeholder schema authoring beyond what current parser support and curated seed data can safely enable.

## Proposed milestone scope
### 1. Template persistence and lifecycle
Use the existing `Template` model as the system of record. Tighten the semantics of `status` around a simple lifecycle: `draft`, `private`, `public`, and `archived`. Add `publishedAt` so public transitions are explicit and queryable. Avoid creating a second visibility field unless implementation evidence later proves it necessary.

### 2. Template APIs
Introduce the missing API surface under `/api/templates` so templates can be created, read, updated, and published with session-aware authorization. Use the same auth and validation conventions already used elsewhere in the repo.

### 3. Editor save flow
Add a “Save as template” action in the editor that captures title, description, category, and tags, extracts placeholders from the current VidScript, and persists the result via API without interfering with preview or render flows.

### 4. Account management
Add a `My Templates` area in account settings so users can see owned templates, inspect status, and perform publish/unpublish or metadata edits.

### 5. Public template library
Replace hardcoded template cards and detail pages with DB-backed public records. Preserve the current visual design where possible to minimize UI churn.

### 6. Seed starter outcome packs
Populate the public library with a small but credible set of starter templates across ads, testimonials, memes, and artistic/shader-driven looks. This should be shipped as real template data, not frontend mock content.

## Architecture and data-flow considerations
### Data model
Use the current `Template` table with the following near-term adjustments:
- Add `publishedAt: DateTime?`.
- Standardize the meaning of `status` values.
- Add indexes that support common library and account queries, such as `(status, createdAt)` and optionally `(category, status)`.

Do not change the core parser or renderer for this milestone. Templates are persistence and UX around existing VidScript, not a new execution model.

### Save flow
1. User edits VidScript in `/editor`.
2. User opens a save-template form.
3. Client gathers metadata and derives placeholder names using the current parser/existing placeholder extraction helper.
4. Client POSTs the template payload to `/api/templates`.
5. API validates the request with Zod, resolves the authenticated user, and creates the record in Prisma.

### Publish flow
1. User navigates to account template management.
2. User chooses publish or unpublish on an owned template.
3. API verifies ownership and applies state transition rules.
4. Public library queries immediately reflect the new visibility.

### Browse and use flow
1. `/templates` lists public template records from the database.
2. `/templates/[id]` renders a public template with its placeholder form.
3. On “Use template”, the generated VidScript is written to `localStorage['vidscript_import']`.
4. The client routes to `/editor`.
5. The editor reads that imported VidScript using its existing import path.

This last point is important because it aligns the template flow with the repo’s existing editor import behavior. The current hardcoded `?code=` pattern should not be the long-term handoff contract.

## Backend workstream
### Schema hardening
- Add `publishedAt` to the Prisma `Template` model.
- Normalize allowed status transitions.
- Add or confirm indexes for public and owned-template queries.
- Generate and apply a migration.

### API implementation
Implement the following endpoints:
- `POST /api/templates`
- `GET /api/templates` with scope support such as `public` and `mine`
- `GET /api/templates/[id]`
- `PUT /api/templates/[id]`
- `POST /api/templates/[id]/publish`
- `POST /api/templates/[id]/unpublish`

Optionally defer delete behavior in favor of archive semantics if that matches the existing product direction more closely.

### Validation and authorization
- Use Zod schemas for create and update payloads.
- Require authentication for mutations and “mine” queries.
- Enforce owner checks on all mutations.
- Allow public detail reads only for `public` templates unless the requester is the owner.
- Avoid broad fallback behavior; return explicit error responses that match project conventions.

## Frontend workstream
### Editor
- Add a clearly placed save-template action near existing editor actions.
- Provide a lightweight metadata capture UX, preferably modal or panel based on current UI patterns.
- Reuse parser-derived placeholder extraction instead of inventing a separate placeholder editor.
- Surface save success and validation errors clearly.

### Account
- Add a `My Templates` section or tab alongside existing account surfaces.
- Show title, category, status, updated timestamp, and public/private state.
- Add publish/unpublish and edit-metadata actions.
- Keep initial management simple; duplication and analytics can wait.

### Library
- Replace hardcoded `SAMPLE_TEMPLATES`-style content with server-loaded or API-backed database data.
- Preserve current card styling and major layout patterns where practical.
- Add minimal category and sort filters only after the base list is working.

### Template detail
- Replace hardcoded template maps with a DB-backed detail page.
- Render a placeholder form from stored placeholder metadata.
- Update “Use Template” so it uses the existing editor import pathway rather than query-string code injection.

## Integration and content workstream
### Seed outcome packs
Create 8 to 12 starter templates as real template records in the database, not frontend mocks. Target balanced coverage across:
- ads
- testimonials
- memes
- artistic

Seed data should include practical descriptions, consistent category naming, and useful placeholder metadata. This content should validate the full template lifecycle and make the library immediately usable.

### Metadata standards
Adopt a small canonical category set for the seed and user-facing filters:
- `ads`
- `testimonials`
- `memes`
- `artistic`

Use tags rather than proliferating categories for finer distinctions.

## Risks and mitigation
### Placeholder metadata is minimal
Current parser support appears to focus on extracting placeholder names rather than rich field definitions.
Mitigation: keep user-saved placeholder capture simple in this milestone, and allow curated seed templates to provide richer placeholder JSON where needed.

### Handoff mismatch between template detail and editor
Current template detail behavior appears to differ from the editor’s existing import mechanism.
Mitigation: standardize on `localStorage['vidscript_import']` as the single handoff path for template usage.

### Access-control mistakes
Public browsing and owner-only editing are easy to blur if read and mutation logic diverge.
Mitigation: centralize authorization checks in API routes and keep state-transition rules explicit.

### Scope creep into parser, shader, or marketplace work
The repository likely has adjacent systems that make it tempting to expand scope.
Mitigation: explicitly defer parser DSL changes, paid marketplace logic, and asset pipelines from this milestone.

## Dependencies and sequencing
The recommended order is:
1. Schema hardening.
2. Core template API creation and detail/update endpoints.
3. Publish lifecycle endpoints.
4. Editor save flow.
5. Account template management.
6. DB-backed library and detail pages.
7. Template-to-editor handoff fix.
8. Seed outcome packs.
9. Regression coverage and final validation.

This sequence delivers the backend contract first, then owner UX, then public discovery, then starter content, while keeping the critical handoff fix in the same milestone.

## Validation strategy
### Automated validation
Run existing repo checks only:
- `npm run lint`
- `npm run build`
- `npm run test`

Use targeted Playwright coverage where appropriate, especially around template library, account management, and editor flows.

### Test scenarios
- Authenticated user saves a template from the editor.
- Draft/private templates appear in account management but not the public library.
- Publish makes a template visible publicly.
- Unpublish removes it from the public library.
- Template detail placeholder entry results in correct code being loaded into the editor.
- Seeded templates appear in the public library and can be used end-to-end.

### Manual checks
- Save a valid script with placeholders.
- Attempt save with invalid or empty VidScript and confirm correct validation behavior.
- Publish and unpublish transitions from account management.
- Verify non-owners cannot edit private templates.
- Verify the editor receives imported VidScript exactly once and with expected content.

## Execution todos
### P0 foundation
- `tpl-schema-status-published-at`: Add `publishedAt`, formalize status lifecycle, add indexes.
- `tpl-api-create-list`: Implement template create and list endpoints with auth-aware scopes.
- `tpl-api-detail-update`: Implement detail and update endpoints with owner/public access rules.
- `tpl-api-publish-lifecycle`: Implement publish and unpublish lifecycle endpoints.
- `tpl-editor-save-ui`: Add editor save-template UX wired to the API.
- `tpl-e2e-regression`: Add or update regression coverage for save/publish/browse/use flows.

### P1 product-complete milestone work
- `tpl-account-my-templates-tab`: Add account template management.
- `tpl-library-db-list`: Replace hardcoded template library with DB-backed public templates.
- `tpl-detail-db-page`: Replace hardcoded template detail with DB-backed detail and placeholders.
- `tpl-editor-import-handoff`: Standardize template-to-editor import using `vidscript_import`.
- `tpl-seed-outcome-packs`: Seed 8 to 12 free public starter templates.

### P2 polish
- `tpl-library-filters`: Add minimal category and sort filters to the library.

## Todo dependency map
- `tpl-api-create-list` depends on `tpl-schema-status-published-at`.
- `tpl-api-detail-update` depends on `tpl-schema-status-published-at`.
- `tpl-api-publish-lifecycle` depends on `tpl-api-detail-update`.
- `tpl-editor-save-ui` depends on `tpl-api-create-list`.
- `tpl-account-my-templates-tab` depends on `tpl-api-create-list` and `tpl-api-publish-lifecycle`.
- `tpl-library-db-list` depends on `tpl-api-detail-update`.
- `tpl-detail-db-page` depends on `tpl-api-detail-update`.
- `tpl-editor-import-handoff` depends on `tpl-detail-db-page`.
- `tpl-seed-outcome-packs` depends on `tpl-schema-status-published-at`.
- `tpl-library-filters` depends on `tpl-library-db-list` and `tpl-seed-outcome-packs`.
- `tpl-e2e-regression` depends on `tpl-editor-save-ui`, `tpl-account-my-templates-tab`, `tpl-library-db-list`, `tpl-detail-db-page`, and `tpl-editor-import-handoff`.

## Exit criteria
This milestone is complete when:
- authenticated users can save templates from the editor,
- users can manage and publish templates from account,
- `/templates` and `/templates/[id]` are backed by real database data,
- using a template reliably re-enters the editor with imported VidScript,
- the library contains enough starter content to demonstrate meaningful use cases,
- and the milestone passes the existing lint, build, and test workflow.
