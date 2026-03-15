# ReelForge Complete Implementation Plan v2

## 1. Current State Assessment
- Parser: PEG grammar mostly complete (imports, timeblocks, basic ops, filters).
- Preview: Three.js + EffectComposer + ShaderPass implemented in src/lib/preview/engine.ts.
- UI: Editor, templates, assets, account pages with shadcn/ui.
- Auth: NextAuth + Prisma, login/register pages.
- Render: Basic worker and API.
- Missing: Full DSL interpreter, billing, advanced templates, expanded DSL attributes, plugin system, WebGPU support.

## 2. Research Summary: TypeGPU, Three.js Shaders, WebGPU
- **Three.js Shaders**: Current engine uses GLSL via ShaderMaterial/ShaderPass. Good for v1. Supports custom uniforms, vertex/fragment. Fits existing VidScript filter system.
- **WebGPU**: Successor to WebGL, better performance for complex effects. Three.js has experimental WebGPURenderer.
- **TypeGPU**: TS-first library for WebGPU (typed compute/shaders, WGSL generation). Provides type safety for shader params from DSL. 
  - **Fit**: Use for v2 advanced shaders. DSL can generate typed TS shader code -> WGSL. Reduces runtime errors in custom effects.
  - **Recommendation**: Add `@typegpu/tgpu` + `wgpu` in v2. Keep WebGL/Three.js for broad compatibility in v1. Add `useWebGPU` flag in output options.
  - **Integration**: Extend shader library to output WGSL when enabled. Update preview/engine to support WebGPU context.

**Optimum choice**: Prioritize WebGL v1 completion, add WebGPU/TypeGPU as opt-in v2 feature for performance-critical custom shaders/plugins.

## 3. VidScript DSL Extensions
- Add comprehensive styling: text(color, fontSize, fontFamily, align, animation: 'fade|slide|typewriter', duration).
- Effect params: filter(name, params: {intensity, speed, ...}).
- Transitions: [t1-t2] = transition 'fade' from clip1 to clip2.
- Plugin system: `plugin "glsl-plugin-name" with {uniforms}` or `import shader "plugin:glitch"`.
- Variables, functions, conditionals for more expressiveness.
- Update grammar.peggy, types.ts, interpreter.

Update plan-v1/03-dsl-syntax.md and 04-peggy-grammar.md accordingly.

## 4. Website & User Features
- **Registration/Login**: Enhance existing with email verification (Resend or Nodemailer), social (Google/GitHub via existing integrations).
- **Billing**: Integrate Stripe. 
  - Models: Credit system (free tier 5 renders/mo, paid $9/mo unlimited or pay-per-render).
  - API: /api/billing for checkout, webhooks.
  - UI: Pricing page, account billing tab.
- **Ready-made Templates**: 20+ templates (wedding, product, travel, motivational). Store in DB with DSL code, thumbnail, category. Gallery with search/filter. "Use template" loads into editor.
- **UI Polish**: Comprehensive styling with Tailwind + shadcn (dark theme consistent), responsive, better editor with Monaco + autocomplete for DSL, real-time preview sync.

## 5. Composable Reusable Shaders & Marketplace
- **Shader Model Extension**: Add `tunableAttributes Json` (array of {name: string, type: 'float'|'color'|'int', default: any, min?: number, max?: number, step?: number}), `isPublic Boolean`, `priceCents Int`, `downloads Int`, `category`.
- **Authoring**: Creators write GLSL with tunable comments (`// @tunable intensity:float=0.5 [0.0-1.0]`), UI form auto-generates controls. Store in Shader model + marketplace.
- **Usage in VidScript**: `apply shader "vignette-pro" to main_video with {intensity: 0.7, color: "#ff0000"}` or on elements/text. Parser supports ShaderApplyNode with params object.
- **Marketplace**: Separate tab/filter in templates page or /shaders. 25% platform fee on paid shaders. Preview with sample video.
- **Runtime**: In PreviewEngine/Render, dynamically create ShaderPass with uniform binding from tunables. Three.js ShaderMaterial with uniform updates. Support chaining multiple shaders.
- **Security**: GLSL validation (no forbidden keywords), sandbox uniforms, rate limiting on custom shaders.
- Registry in shaders/library.ts + DB queries for public shaders.

Update grammar for ShaderApply syntax, extend types, add shader editor UI with live tunable sliders. Integrate with existing Shader model.

## 6. Agent Skills to Create
Create these SKILL.md files:
- vidscript-dsl: For extending/validating DSL.
- webgl-shader-integration: Guidelines for Three.js + custom GLSL.
- template-management: For CRUD and gallery.
- billing-stripe: Integration patterns.
- reelforge-rendering: WebGL/WebGPU pipeline.

Place in .opencode/skills/ or .agents/skills/.

## 7. Implementation Phases (Updated Roadmap)
**Phase 1: Core Completion (1-2 weeks)**
- Fix parser-interpreter-preview integration.
- Expand DSL grammar + types + interpreter for new attributes.
- Polish editor UI with real-time parsing/preview.

**Phase 2: Templates & UI (1 week)**
- Implement 10+ ready templates.
- Enhance templates page.

**Phase 3: Auth & Billing (1-2 weeks)**
- Complete registration flow.
- Add Stripe for billing/credits.
- Update Prisma schema (add Credit, Subscription, Template models).

**Phase 4: Plugins & Advanced Rendering (2 weeks)**
- Implement plugin system.
- Research/implement TypeGPU option.
- Upgrade render worker for headless WebGPU if possible.

**Phase 5: Polish, Tests, Deploy**
- E2E tests update.
- Comprehensive styling.
- Deploy to Hetzner.
- LLM agent improvements for DSL generation.

## 8. Technical Decisions
- Use Stripe for billing (standard, reliable).
- Extend existing Three.js for shaders (no new deps for v1).
- Add `stripe` and `@stripe/stripe-js` to deps.
- For plugins: Support local first, then URL-based with validation.
- Database: Add tables for templates, plugins, usage_credits, subscriptions.

## Next Steps
1. Update Prisma schema for new models.
2. Implement DSL extensions.
3. Create the SKILL.md files.
4. Add billing pages.

See individual MD files for detailed specs.
