 ReelForge v1 - Executive Summary
 Project Overview
- **Name**: ReelForge
- **Type**: Web-based video creation platform
- **Target Users**: Content creators, beginners, reel makers (YouTube, TikTok, Instagram)
- **Core Feature**: Text-based video editing with GLSL shader support
 Key Design Decisions
 1. Plain Text DSL (Not YAML/JSON)
- Users write videos in near-plain English
- Simple time markers: `[0 - 10]` means 0 to 10 seconds
- Extensible with variables, functions, plugins
 2. Single-Dimensional Timeline
- No complex multi-track timeline
- Time blocks: `[start - end] = instruction`
- Sequential, easy to understand
 3. WebGL-First Rendering
- GPU-accelerated via headless-gl
- Custom GLSL shaders supported
- Preview in browser, export via WebCodecs
 4. Self-Hosted Infrastructure
- Single Hetzner server (~€50/mo)
- No third-party dependencies
- Fully open source
 v1 Scope
- ✅ Multiple presets: 9:16 (reels), 1:1 (square), 16:9 (landscape)
- ✅ Custom GLSL shaders with library support (shaders.tynai3, glslViewer)
- ✅ Audio mixing (volume, fade in/out, trim)
- ✅ Template marketplace ready (not v1)
- ✅ LLM integration (user provides API key)
- ❌ Mobile app (v2)
 Tech Stack
| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14 |
| Editor | Monaco Editor |
| Backend | Bun.js + Hono |
| Parser | Peggy (PEG) |
| Database | PostgreSQL + Prisma |
| Queue | BullMQ + Redis |
| Preview | Three.js + WebGL |
| Render | headless-gl + WebCodecs |
| Storage | Local filesystem |
 Cost
- **Hetzner CCX33**: €48/month
- **Total**: €48-60/month

## Current Status
- Project scaffold created in `/reelforge/`
- Basic parser working (regex-based implementation)
- UI pages functional (home, editor, templates)
- Build passing
- Dev server running at http://localhost:3000
