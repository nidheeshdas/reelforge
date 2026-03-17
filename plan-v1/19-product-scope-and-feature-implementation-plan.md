# ReelForge Product Scope and Feature Implementation Plan
**Status**: Draft  
**Author**: Alex (PM)  
**Last Updated**: 2026-03-16  
**Audience**: Founder, product, engineering, design

---

## 1. Executive Summary

ReelForge should not try to become "all of video production" in its next phase. Within the current implementation, its strongest product position is:

> **the fastest way for a small business, creator, hobbyist, or YouTuber to turn assets, prompts, templates, text, and shaders into short-form promotional or creative video without learning a timeline editor.**

The highest-value next move is **not** 3D, and it is **not** a paid marketplace first. The best value-per-feature comes from turning the current rendering/editor foundation into **repeatable creation systems**:

1. user-saved templates,
2. reusable VidScript blocks ("plugins" in product language),
3. personal/imported shader libraries,
4. template packs for real use cases like ads, endorsements, memes, and artistic shorts,
5. image generation via `imagine("...")` with caching.

That sequence uses the current stack well:

- Next.js app + API routes
- Prisma/Postgres schema with `Template`, `Shader`, `Asset`, `Purchase`, `Render`, `User`
- VidScript parser + AST pipeline
- browser preview + server render parity
- asset storage/import flows
- account API key management

The biggest PM recommendation in this document is simple:

> **Build "production workflows" before "platform dreams."**

Users will feel more value from "Save this as a reusable testimonial ad template" than from "we support a future 3D marketplace."

---

## 2. Product Goal

### Core user problem

Target users want to create good-looking short-form video quickly, but they face three recurring problems:

1. timeline editors are too slow and too manual for repeatable content,
2. creative tools are powerful but not reusable enough for non-experts,
3. AI tools generate media, but they do not reliably assemble those assets into brandable, repeatable, editable video workflows.

### Product objective

ReelForge should become a **repeatable video production system** for:

- small business promos,
- product ads,
- testimonials and endorsements,
- YouTube short-form content,
- meme-style videos,
- artistic/experimental shader-driven pieces.

### Product truth

Today, ReelForge is best suited for:

- **short-form video**, not full long-form editing,
- **2D compositing + text + shaders + asset orchestration**, not general 3D scene authoring,
- **template-driven creation**, not open-ended professional post-production.

That is not a weakness. It is the right wedge.

---

## 3. Current System Reality

This plan is based on the **actual repository state**, not just the older `plan-v1` assumptions.

### What already exists

- A VidScript editor with browser preview and server-side export
- A parser-driven composition model
- Implemented composition constructs including:
  - trim,
  - resize,
  - speed,
  - loop,
  - opacity,
  - overlay,
  - composite,
  - text,
  - filters,
  - shaders
- Browser preview and browserless final rendering with shared composition logic
- Assets flow for:
  - local uploads,
  - sample assets,
  - Google Drive browsing,
  - Dropbox browsing
- Account system with:
  - user profile,
  - provider API keys,
  - external connections
- Template gallery UI
- Database models already present for:
  - `Template`
  - `Purchase`
  - `Shader`
  - `Render`
  - `Asset`
  - `User.credits`
  - `User.isCreator`
  - `User.stripeConnectId`

### What does not exist yet

- User-authored template CRUD and publishing flow
- Public creator workflows
- A real plugin/snippet system
- A user-facing shader authoring/import workflow
- AI-generated asset resolution inside VidScript
- A production-ready marketplace flow
- A 3D asset/scene system

### Critical constraints

This document assumes:

- **no major new platform stack**
- reuse the current parser, preview, render, account, and asset systems
- avoid opening new architectural fronts unless the value is clearly superior

In practice that means:

- prefer VidScript/DB/API/UI changes over engine rewrites,
- prefer template/plugin/shader systems over whole new rendering categories,
- prefer image generation over video generation first,
- prefer free publishing over paid marketplace first.

---

## 4. Product Principles

### 4.1 Build reusable workflows, not isolated features

The product should help users produce the same class of video repeatedly:

- weekly offers,
- testimonial clips,
- meme variants,
- creator intros,
- seasonal promos.

That makes templates, plugins, and presets more valuable than one-off advanced controls.

### 4.2 Keep extensibility safe

"Plugins" should mean **parameterized VidScript blocks**, not arbitrary runtime code execution.

### 4.3 Preserve preview/render parity

Any feature that cannot be trusted in both preview and export should not be prioritized.

### 4.4 Use the current data model wherever possible

If a feature can be expressed by extending `Template`, `Shader`, `Asset`, and `Render`, that is preferred over inventing an entirely separate subsystem.

### 4.5 Package outcomes, not primitives

Users do not buy "text manipulation nodes." They want:

- meme captions,
- price cards,
- testimonial callouts,
- lower-thirds,
- CTA overlays,
- quote styles,
- artistic looks.

---

## 5. Recommended Product Positioning

### Positioning statement

ReelForge is a **short-form video production studio driven by text, reusable templates, and creative shader effects**.

### What we should optimize for now

- vertical social video
- square product promos
- landscape short intros/outros
- ads, endorsements, creator content, memes, artistic promo clips

### What we should not pretend to be yet

- a Premiere replacement
- a full 3D animation suite
- a general media generation platform
- a large-scale paid creator marketplace from day one

---

## 6. Feature Decision Matrix

| Feature | User Value | Effort in Current Stack | Recommendation | Why |
|---|---:|---:|---|---|
| Save VidScript as template | Very High | Medium | **Build now** | Immediate reuse, foundation for packs and marketplace |
| Publish free templates to library | High | Medium | **Build now** | Turns editor output into discoverable value |
| Template packs for ads, endorsements, memes, artistic shorts | Very High | Low-Medium | **Build now** | Outcome-led value with minimal engine risk |
| Import custom GLSL shaders + personal shader library | High | Medium | **Build now** | Strong differentiator and fits current renderer |
| Text presets / text plugins | Very High | Medium | **Build now** | Text is core to ads, memes, endorsements, Shorts |
| VidScript-based reusable plugins/snippets | High | Medium | **Build now / next** | Makes advanced workflows reusable without new tech |
| `imagine("...")` image generation + caching | High | Medium | **Build next** | Strong user value, fits asset pipeline, manageable if image-first |
| Free public creator marketplace | Medium-High | Medium | **Build next** | Good network effect after template creation exists |
| Paid template marketplace | Medium | High | **Later** | Needs payments, disputes, payouts, moderation, trust |
| Paid shader/plugin packs | Medium | High | **Later** | Only makes sense after free library usage is proven |
| Grok video generation in VidScript | Medium | High | **Later** | Heavy async workflow, cost, caching, quality variance |
| Third-party 3D models marketplace | Low near-term | Very High | **Do not prioritize** | Too far from current 2D workflow and too much engine/UI expansion |

---

## 7. Detailed Feature Plan

## 7.1 Save VidScript as Template

### Problem

Users can make something useful once, but the product does not yet turn that output into a reusable business asset.

### Recommendation

**Build first.** This is the single highest-value product feature available in the current implementation.

### User outcome

- A small business can save a promo as a reusable template.
- A YouTuber can save intro/outro structures.
- A hobbyist can save meme or quote formats.
- An agency can create multiple campaign skeletons.

### Implementation in the system

#### UI

- Add `Save as template` from `/editor`
- Add template metadata form:
  - title
  - description
  - category
  - tags
  - thumbnail choice or preview render
  - publish state: private / public
- Add "My templates" to `/account`
- Extend `/templates` to load real database-backed templates instead of only hard-coded examples

#### Parser / DSL

- Reuse existing placeholder extraction
- Standardize placeholder conventions so saved templates can expose editable inputs cleanly
- No major DSL change required for v1 template saving

#### Database

Use the existing `Template` model as the foundation.

Recommended schema additions:

- `visibility` or reuse `status` with stricter states:
  - `draft`
  - `private`
  - `public`
  - `archived`
- `publishedAt`
- `featuredRank` or lightweight discovery metadata later

#### API

Add template CRUD endpoints:

- `POST /api/templates`
- `PUT /api/templates/:id`
- `GET /api/templates`
- `GET /api/templates/:id`
- `POST /api/templates/:id/publish`
- `POST /api/templates/:id/unpublish`

#### Render / preview

- No core render changes required
- Optional: generate template thumbnail from preview/export later

### Why this should happen before marketplace

Without template creation, there is no real marketplace supply.

---

## 7.2 Outcome Packs: Ads, Endorsements, Memes, Artistic Shorts

### Problem

Users do not think in composition primitives. They think in outcomes:

- "make a testimonial video,"
- "make a vertical ad,"
- "make a meme,"
- "make something visually unique."

### Recommendation

**Build immediately after template saving.**

This is where ReelForge starts to feel like a product for real jobs, not just a technical demo.

### Packs to build first

#### Small business ad pack

- product promo
- offer/discount card
- before/after comparison
- CTA end card
- price + logo + website block

#### Endorsement/testimonial pack

- talking-head testimonial
- quote card
- rating stars
- customer name/title lower-third
- side-by-side product proof layout

#### Meme pack

- top/bottom meme text
- reaction caption
- fast punchline card
- square and vertical meme presets

#### Artistic shader pack

- glitch
- dream glow
- VHS
- duotone
- chromatic aberration
- posterize / abstract looks

### Implementation in the system

#### UI

- New categories inside `/templates`
- "Start from use case" entry points from home/editor later
- Editor insert menu for common blocks:
  - CTA
  - lower-third
  - quote
  - price card
  - meme caption

#### Data model

- Mostly template content plus categories/tags
- No new core platform tech required

#### Render

- Reuse existing text, filter, shader, overlay, and composition nodes

### PM note

This is one of the best value-per-effort investments in the entire roadmap.

---

## 7.3 Text Presets and Text Plugins

### Problem

Text is central to:

- ads,
- testimonials,
- memes,
- Shorts,
- captions,
- creator branding.

But raw text parameters are too low-level for most users.

### Recommendation

**Build now.** This is a force multiplier for every target segment.

### Product approach

Do not build "advanced text scripting" first. Build:

- named presets,
- parameterized text blocks,
- reusable text plugins.

### Examples

- `MemeTopBottom`
- `QuoteCard`
- `LowerThird`
- `PriceTag`
- `CTAButton`
- `CountdownBadge`
- `StarRating`
- `TestimonialFrame`

### Implementation in the system

#### Recommended architecture

Implement text plugins as **VidScript-backed reusable blocks**, not separate runtime code.

#### UI

- Add a "Text blocks" library in the editor
- Parameter form for each block
- Preview generated block before insertion

#### DSL

Introduce a plugin/snippet usage syntax such as:

```vidscript
use plugin "meme-top-bottom" with {
  top: "WHEN THE CLIENT SAYS JUST ONE SMALL CHANGE",
  bottom: "AND THE ENTIRE COMPOSITION BREAKS"
}
```

Alternative minimal syntax:

```vidscript
[0s - 4s] = textPreset "meme-top-bottom", top: "...", bottom: "..."
```

#### Parser

- Add a new node for plugin or preset application
- Expand that node into standard supported text instructions before preview/render

#### Render

- No new renderer technology required
- Plugin expansion compiles to existing text + timing + styling primitives

### Recommendation detail

For v1, prefer:

- **preset expansion**

over:

- a general user-programmable text engine

---

## 7.4 VidScript Plugins

### Problem

Advanced users want reuse and composability, but arbitrary code plugins would introduce complexity, security risk, and product confusion.

### Recommendation

**Define plugins as reusable VidScript blocks, not executable code.**

This preserves the current product model and avoids inventing a separate execution runtime.

### PM definition

A ReelForge plugin is:

- a reusable VidScript fragment,
- with named parameters,
- saved in the database,
- insertable into templates or scripts,
- expandable into normal VidScript before preview/render.

### Why this is the right interpretation

It gives users the feeling of extensibility while staying within the current architecture.

### Implementation in the system

#### Data model

Two valid paths:

##### Path A — recommended

Extend `Template` with a `kind` field:

- `template`
- `plugin`
- `text-block`
- `shader-pack` later

Why this is preferred:

- one publishing system,
- one marketplace/discovery model,
- one creator dashboard,
- less schema sprawl.

##### Path B

Add a dedicated `Plugin` model.

This is cleaner technically, but lower leverage initially.

### Recommendation

Use **Path A first**.

#### Parser / compiler

- Add `use plugin` grammar support
- Resolve the named plugin from DB or local library
- Replace the plugin call with generated VidScript/AST nodes

#### UI

- "Save selection as plugin" can come later
- Start with "Create plugin" form from an existing template/block authoring page
- Insert plugin from editor library

#### Marketplace

- Free sharing first
- monetization later if usage justifies it

### Non-goal

Do not support arbitrary JS/WASM plugin execution.

---

## 7.5 Custom GLSL Shader Import and Shader Library

### Problem

Artistic differentiation is one of ReelForge's strongest potential moats, but users currently do not have a clear creator workflow for importing and managing shaders.

### Recommendation

**Build now.** This is a product differentiator, not a nice-to-have.

### User outcome

- creators can save their own shader looks,
- brands can keep signature visual styles,
- hobbyists can experiment with creative effects,
- future marketplace supply becomes possible.

### Implementation in the system

#### Existing foundation

- `Shader` Prisma model already exists
- shader application already exists in the composition engine

#### UI

- Add personal shader library page or account section
- Add "Import GLSL" flow:
  - paste code
  - upload `.glsl`
  - name it
  - optionally define tunable uniforms
- Add insert/apply flow from editor

#### DSL

Keep the current usage model as close as possible to today's syntax:

```vidscript
[0s - end] = shader "brand-neon", intensity: 0.7
```

Add import/reference support:

```vidscript
import shader "brand-neon" from library
```

or simply resolve shader names from the user/public library without explicit import.

#### Database

Extend `Shader` with:

- `description`
- `isPublic`
- `category`
- `thumbnailUrl`
- `status`
- `uniformSchema Json?`
- `downloads`
- `priceCents` later, not now

#### Validation

- run shader compile validation before publish,
- reject unsupported or broken shaders,
- restrict public publishing to safe GLSL patterns if needed.

### PM recommendation

The first milestone is **personal shader library**, not marketplace monetization.

---

## 7.6 `imagine("...")` with Grok/xAI Generation and Caching

### Problem

Users often do not have the right source image for a promo, meme, background, or stylized shot. They want to generate it inside the creative flow.

### Recommendation

**Build image generation first. Defer video generation.**

This is the right balance between user value and implementation reality.

### Product design recommendation

Support:

```vidscript
input hero = imagine("Luxury coffee bag on a wooden table, dramatic lighting", kind: "image", ratio: "9:16")
```

Not first:

```vidscript
input clip = imagine("A cinematic drone flythrough of a mountain village", kind: "video")
```

### Why image-first is the right choice

- image outputs fit naturally into the current asset pipeline,
- caching is straightforward,
- preview/export use the same resolved asset,
- the generated asset becomes reusable in future templates,
- costs and latency are easier to control.

### Why video generation should wait

- much longer generation times,
- more fragile external dependency behavior,
- more expensive per request,
- requires more durable job orchestration than the current product should prioritize next.

### Implementation in the system

#### Account/API keys

Extend the existing API key model/provider list to support xAI/Grok.

This fits the existing account architecture better than inventing a separate secret system.

#### Parser

Add support for `imagine(...)` as an input expression or generated asset node.

#### Asset resolution flow

Before preview or export:

1. parse the script,
2. find all `imagine(...)` calls,
3. normalize prompt + params,
4. hash to a stable cache key,
5. check `Asset` for an existing generated result,
6. if cache miss:
   - call the provider,
   - store the result in local uploads or future R2,
   - save an `Asset` row with:
     - `source = "generated"`
     - `externalId = <hash or provider job id>`
7. rewrite the input to the resolved local asset path,
8. continue with normal preview/render.

#### Database

The existing `Asset` model can be reused for v1 of this feature.

Recommended metadata additions:

- generation provider
- original prompt
- normalized prompt hash
- aspect ratio
- generation settings

These can live in JSON metadata if we want to avoid a dedicated generated-asset model initially.

#### UI

- generated assets should appear in the asset workspace with a `generated` badge
- allow "reuse generated asset in another template"
- show prompt history later

### Product recommendation

Ship `imagine()` for **image generation only** in the first version.

---

## 7.7 Template Marketplace

### Problem

If template creation works, a creator ecosystem becomes attractive. But commerce adds complexity quickly.

### Recommendation

Split the marketplace into two phases:

### Phase A — recommended next

**Free public marketplace**

- creators publish templates
- users browse and use them
- downloads and popularity are tracked
- no payments yet

### Phase B — later

**Paid buy/sell marketplace**

- paid template listings
- purchase records
- creator payouts
- moderation and trust systems

### Why paid marketplace should not be first

Even though the schema already hints at it (`Purchase`, `isCreator`, `stripeConnectId`), paid marketplace work is not just a feature:

- payments
- refunds
- taxes
- payout compliance
- fraud prevention
- content disputes
- ranking and moderation

That is a lot of complexity for a product that still needs stronger creation loops first.

### Implementation in the system

#### Free marketplace first

- real DB-backed `/templates`
- creator attribution
- publish/unpublish
- categories, tags, sorting
- downloads and favorites later

#### Paid marketplace later

When the creation side proves demand:

- turn on `priceCents`
- activate purchase flow
- connect creator payouts
- add purchase entitlement checks

### PM recommendation

If the constraint is truly **no more tech right now**, then do **not** start with paid marketplace.

Start with:

- save template,
- publish template,
- browse/use template,
- measure adoption.

---

## 7.8 Third-Party 3D Models Marketplace

### Problem

3D models sound exciting, but they do not solve the most urgent user problem in the current product.

### Recommendation

**Do not prioritize this in the current roadmap.**

### Why

The current product is optimized for:

- video/image inputs,
- text overlays,
- shader effects,
- 2D composition on a single timeline.

A 3D marketplace would require much more than just "import model files."

### What would actually be required

- new asset types: GLTF/GLB model support
- scene graph constructs in VidScript
- transform/camera/light semantics
- 3D preview authoring UX
- server-render parity for 3D asset loading
- performance testing for preview and headless render
- creator-friendly controls for model placement and animation

### Product trade-off

This is a large expansion into a different category of creative tooling. It is not the best use of focus while the core short-form workflow is still maturing.

### PM stance

Revisit only after:

- templates are working,
- plugins/snippets are used,
- shader library is established,
- `imagine()` image generation proves useful,
- real user demand emerges for product-centric 3D overlays.

---

## 8. Recommended Roadmap

## 8.1 Now

### 1. Save VidScript as template
### 2. Real template CRUD + free publishing
### 3. Outcome packs:
- small ads
- endorsements/testimonials
- memes
- artistic promos
### 4. Personal shader import/library
### 5. Text presets and text plugins
### 6. VidScript plugins as reusable blocks

These features create the strongest immediate value loop:

**create → save → reuse → publish → remix**

---

## 8.2 Next

### 7. `imagine()` image generation with caching
### 8. Public free marketplace for templates/plugins/shaders
### 9. Better creator workflows:
- my templates
- my plugins
- my shaders
- publish status

---

## 8.3 Later

### 10. Paid template marketplace
### 11. Paid shader/plugin packs
### 12. Grok video generation

Only after usage proves:

- template creation is active,
- public publishing is active,
- users repeatedly reuse generated assets,
- creators want monetization.

---

## 8.4 Not Now

### 13. Third-party 3D models marketplace
### 14. Full 3D authoring scene system
### 15. Arbitrary executable plugin runtime

---

## 9. Implementation Priority by Value per Added Feature

If we rank purely by user value per implementation cost within the current architecture:

### Tier 1 — highest ROI

1. Save as template  
2. Template packs for real use cases  
3. Text presets / text plugins  
4. Shader import + personal shader library  

### Tier 2 — strong ROI

5. VidScript reusable plugins/snippets  
6. Free public template marketplace  
7. `imagine()` image generation + caching  

### Tier 3 — only after proof

8. Paid marketplace  
9. Grok video generation  

### Tier 4 — avoid for now

10. Third-party 3D models marketplace  

---

## 10. System Areas Affected by Each Feature

## 10.1 Editor and creation workflow

Primary files/areas:

- `/editor`
- template save flows
- plugin insertion flows
- shader import/application UI
- asset workspace

## 10.2 Parser and DSL

Primary files/areas:

- `src/parser/grammar/vidscript.peggy`
- `src/parser/grammar/parser.js`
- `src/parser/index.ts`
- `src/types/vidscript.ts`

Needed for:

- `use plugin`
- `imagine(...)`
- shader import/reference improvements

## 10.3 Preview and render

Primary areas:

- preview composition builder
- shared render core
- server render pipeline

Needed for:

- resolved generated assets,
- imported shaders,
- plugin-expanded VidScript

## 10.4 Database and content models

Primary area:

- `prisma/schema.prisma`

Likely extensions:

- richer `Template`
- richer `Shader`
- optional template/plugin `kind`
- optional publication metadata

## 10.5 Marketplace/discovery

Primary areas:

- `/templates`
- template detail pages
- account creator area
- purchase flow later

---

## 11. Non-Goals for the Next Phase

To protect focus, these should be explicitly out of scope for the next implementation cycle:

- mobile app
- collaborative editing
- long-form multi-track editing
- 3D asset marketplace
- executable plugin runtime
- paid creator commerce before free publishing is working
- video generation before image generation proves value

---

## 12. Success Metrics

The next phase should be measured by workflow adoption, not just feature completion.

### Primary metrics

- % of exports started from a template
- % of active users who save at least one template
- % of active users who reuse a saved template/plugin
- % of active users who apply a custom or imported shader
- editor → export conversion rate

### Secondary metrics

- number of public templates published
- number of template uses/downloads
- number of shader imports
- `imagine()` cache hit rate
- average time from editor open to successful export

### Market readiness signals for later marketplace work

Do not build paid marketplace until we see:

- repeat template creation,
- repeat template reuse,
- creator supply,
- user demand for public artifacts,
- meaningful download/use behavior.

---

## 13. Final Recommendation

If we stay disciplined and do not add major new tech, ReelForge should be built in this order:

1. **Turn scripts into reusable templates**
2. **Turn primitives into reusable blocks/plugins**
3. **Turn shaders into a real creator-facing library**
4. **Package outcome-focused template/plugin packs for ads, endorsements, memes, and artistic videos**
5. **Add `imagine()` for cached image generation**
6. **Open free publishing/marketplace discovery**
7. **Only later add paid commerce**

The most important "no" in this plan is:

> **Do not chase 3D marketplace or paid marketplace before the core repeatable creation loop is proven.**

The most important "yes" in this plan is:

> **Make ReelForge the fastest reusable short-form video production workflow, not the broadest media platform.**

