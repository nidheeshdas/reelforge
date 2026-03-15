# ReelForge Business Case, Use Cases & Technical Deep Dive

## Business Case
**Target Audience**:
- Social media content creators & influencers (TikTok, Instagram Reels, YouTube Shorts) -  primary, 18-35yo, tech-comfortable but not coders.
- Small business owners/marketers needing quick promotional videos.
- Wedding/event videographers for quick highlight reels.
- Hobbyists & students learning video.

**How they use it**:
1. Browse templates or start blank in editor.
2. Use LLM chat: "Make a 15s product promo with text overlays".
3. Edit VidScript (text), preview in real-time with Three.js.
4. Upload assets (R2), apply shaders/filters.
5. Render (consumes credits), download MP4.
6. Buy more credits via Stripe for heavy use or marketplace templates.

**Monetization**:
- Free: 5 credits signup, limited renders.
- Credits: Tiered Stripe purchases (50 for $4.99, 250 for $19.99 (20% off), 1000 for $69 (30% off)).
- Marketplace: 25% platform fee on paid **templates AND reusable shaders** (authors earn from tunable shader packs).
- Premium: $9/mo unlimited basic renders + private shaders.
- Low churn: Easy text interface + LLM + composable shaders reduces frustration vs CapCut/Premiere.

**Market Gap**: Text+shader DSL is unique hybrid between no-code editors and pro tools. LLM makes it accessible. Real-world possibilities: Automated social content pipelines, branded template libraries for agencies, integration with ecom (product videos from Shopify), educational tools.

**Viability**: €50/mo infra + R2 cheap storage. 5k MAU at 20% paid = sustainable revenue.

## Real-World Use Cases & Possibilities
- **Social Reels**: Quick 15-60s videos with text, music, effects.
- **Product Demos**: Ecom ads with overlays, zooms, transitions.
- **Event Highlights**: Wedding, birthday reels from clips + music.
- **Tutorial Snippets**: Screen recordings + voiceover + annotations.
- **Music Visualizers**: Audio-reactive shaders (GLSL/WebGPU).
- **AI-assisted**: LLM generates full scripts from prompt + assets.
- **Enterprise**: White-label templates for brands, batch rendering via API.
- **Creative Coding**: Custom GLSL plugins for unique effects (glitch, particle, 3D).

**Possibilities**: Export to social APIs, version control for scripts (GitHub integration exists), collaborative editing, mobile preview PWA.

## Template Ideas (from use cases)
1. **Wedding Highlight** - Fade transitions, romantic text, music sync.
2. **Product Promo** - Zoom effects, price popups, CTA text.
3. **Travel Reel** - Ken Burns on photos, location tags.
4. **Motivational Quote** - Animated text + epic music + shaders.
5. **Before/After** - Split screen, wipe transitions.
6. **TikTok Transition Pack** - 5 popular effects as reusable blocks.
7. **Instagram Story** - Vertical, stickers, poll overlays.
8. **Podcast Clip** - Waveform visualizer + captions.
9. **Fitness Workout** - Timer overlays, progress bars.
10. **Holiday Greeting** - Seasonal shaders, snow/rain effects.

Store as VidScript + placeholders in Template model.

## Technical Deep Dive & Updates to Plan
**Current Peggy Implementation Analysis**:
- Strengths: Good base for timeblocks, imports, basic method chaining (Trim, filter, text), time units, outputs.
- Gaps: Limited expression support for complex styling (objects/records for style: {color, size}), no full function defs with params, weak error recovery, no plugin syntax, limited AST for animations/transitions, no conditional logic.
- **Add**:
  - Style/Param objects: `text "Hi", style: {color: "#fff", size: 48, anim: "fade"}`.
  - Plugin calls: `use plugin "glitch" with {intensity: 0.8}` or `shader "custom" from "plugins/glitch.glsl"`.
  - Better literals (colors, durations with units), arrays for sequences.
  - Semantic validation post-parse (time overlaps, missing inputs).
  - Update grammar for `AttributeList`, `StyleObject`, `PluginCall`.
  - Improve error messages with location.

**Code Structure** (updated):
- `src/parser/`: grammar + interpreter (new interpreter.ts that walks AST to build timeline/commands).
- `src/lib/render/`: VidScriptExecutor that maps to Three.js/WebGL ops or server render.
- `src/lib/assets/`: R2Service using AWS SDK S3 compatible client for Cloudflare R2.
- Data structures: Timeline as array of {start, end, operations: Op[]}, Op discriminated union from AST.
- `src/types/vidscript.ts`: Extend with StyleNode, PluginNode, TransitionNode.

**Database Updates**:
- Add to Asset: `r2Key String?`, `bucket String?`.
- Add CreditTransaction model for audit (userId, amount, type: 'purchase'|'usage', stripeId).
- Subscription model linked to User.
- Index on Render by status/createdAt for queue.

**Cloudflare Adoption** (maximal):
- **R2**: Primary asset storage (replace local filepath with R2 URLs). Use presigned URLs for upload/download.
- **Images**: For thumbnails/optimized previews.
- **Workers**: Edge rendering or API caching for templates/gallery.
- **Pages**: Host frontend if migrate from Vercel/self-host.
- **Queues**: Replace BullMQ/Redis for render jobs.
- **KV/D1**: For cache/session if applicable. Keep Postgres for complex queries or use Neon.
- Update Asset API to use R2 client (env: R2_ACCOUNT_ID, R2_ACCESS_KEY, etc.).
- CDN via Cloudflare for all static/served videos.

**E2E Tests (Playwright)**:
- Auth: Register, login, protected route redirect.
- Editor: Load, parse valid/invalid VidScript, real-time preview updates, LLM chat interaction.
- Templates: Browse, load template into editor, customize placeholders.
- Assets: Upload to R2, list, use in script.
- Render: Start job, poll status, download (mock for test).
- Billing: Visit pricing, mock Stripe checkout flow, credit balance update.
- Shader: Import custom GLSL, apply in preview.
- Error cases: Invalid time overlaps, missing assets.

**Stripe Credits**:
- Products: Tiered (Starter 50cr, Pro 250cr, Bulk 1000cr) with metadata for discounts.
- Webhook for successful payment -> increment credits + log.
- UI pricing table with "most popular" badge on discounted tier.

Update `plan-v1/14-complete-implementation-plan.md` with these. Next: Implement R2 integration and DSL extensions.
