ReelForge - Complete Plan v1

File Structure
plan-v1/
├── 01-exec-summary.md          # Executive summary
├── 02-architecture.md          # System architecture
├── 03-dsl-syntax.md            # Complete DSL syntax reference
├── 04-peggy-grammar.md         # PEG grammar for parser
├── 05-webgl-pipeline.md       # WebGL rendering pipeline
├── 06-database-schema.md       # Database schema
├── 07-api-spec.md              # API endpoints
├── 08-llm-agent.md            # LLM agent skill
├── 09-shader-library.md        # Built-in GLSL shaders
├── 10-sample-files/            # Example files
│   ├── wedding-reel.vs        # Template example
│   ├── custom-effect.vs       # Custom shader example
│   └── user-workflow.vs       # User workflow example
├── 11-research/                # Research notes
│   ├── webgl-headless.md      # Headless WebGL research
│   ├── ffmpeg-glsl.md         # FFmpeg GLSL research
│   └── video-dsls.md          # DSL research
├── 12-cost-analysis.md         # Cost breakdown
└── 13-roadmap.md              # Implementation phases
---
File: 01-exec-summary.md
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

## Operational setup guides

- `16-google-drive-setup.md`
- `17-dropbox-setup.md`
- `18-cloudflare-r2-setup.md`
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
---
File: 02-architecture.md
 Architecture
 System Overview
┌─────────────────────────────────────────────────────────────────┐
│                     HETZNER CLOUD SERVER                        │
│                    (CCX33, ~€48/month)                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    NEXT.JS FRONTEND                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │Template  │ │ Code     │ │ WebGL    │ │ LLM       │  │  │
│  │  │Gallery   │ │Editor    │ │Preview   │ │Chat       │  │  │
│  │  │          │ │(Monaco)  │ │(720p)    │ │Agent      │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                     │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │                    BUN.JS API SERVER                        │  │
│  │  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐   │  │
│  │  │Parser  │ │ Auth    │ │ Upload   │ │ Job Queue   │   │  │
│  │  │(Peggy) │ │         │ │          │ │ (BullMQ)   │   │  │
│  │  └────────┘ └─────────┘ └──────────┘ └──────────────┘   │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                     │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │              RENDER WORKER (Headless WebGL)               │  │
│  │  ┌───────────┐ ┌────────────┐ ┌───────────────┐        │  │
│  │  │headless-gl│ │ Three.js   │ │ WebCodecs    │        │  │
│  │  │(WebGL 1) │ │ Shaders    │ │ (H.264)      │        │  │
│  │  └───────────┘ └────────────┘ └───────────────┘        │  │
│  │  Input: VidScript → Parse → WebGL → Encode → MP4      │  │
│  │  Output: 1080x1920, 1080x1080, 1920x1080             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         POSTGRESQL + LOCAL STORAGE                      │  │
│  │  /var/lib/reelforge/{uploads,renders,shaders}          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
## Data Flow
1. **User writes VidScript** in Monaco editor
2. **Parser validates** syntax, generates AST
3. **Preview engine** renders low-res (720p) in browser
4. **On export**: Job queued → Worker renders → WebCodecs encodes → File saved
5. **User downloads** MP4
## Key Components
### 1. Parser (Peggy)
- Converts VidScript text → AST
- Validates syntax, reports errors
- Extensible grammar
### 2. Preview Engine (Three.js + WebGL)
- Real-time 720p preview in browser
- Frame-by-frame rendering
- GLSL shader application
### 3. Render Worker (headless-gl)
- Server-side rendering
- Same WebGL pipeline as preview
- WebCodecs for H.264 encoding
### 4. LLM Agent
- User provides OpenAI API key
- Translates natural language → VidScript
- Explains errors, suggests fixes
---
File: 03-dsl-syntax.md
 VidScript DSL Syntax Reference
 Overview
VidScript is a plain-text language for creating videos. Designed for non-coders.
 Time Formats
0 - 10           # 0 to 10 seconds (default)
0s - 10s         # explicit seconds
0ms - 10000ms    # milliseconds
0:00 - 0:10      # mm:ss
0:00:00 - 0:00:10 # hh:mm:ss
frame 0 - frame 300 # frame numbers
## Basic Syntax
### Input
```vidscript
# Video
input main = "video.mp4"
# Audio
input music = "audio.mp3"
# Image
input logo = "logo.png"
# Import custom GLSL shader
import shader "my_effect" from "./shaders/neon.glsl"
Variables
let clip = main
let faded = clip.Opacity(0.5)
let result = faded + title
Time Blocks
[0 - 10] = video main
[0 - 10] = audio music, volume: 0.7
[2 - 5] = text "Hello", position: center
# Multiple instructions in same time block
[0 - 10] = 
    video main
    audio music
    filter "monochrome", intensity: 0.8
Instructions
Video
# Trim
[0 - 10] = video main.Trim(0, 300)
[0 - 10] = main.Trim(start: 0, end: 300)
# Resize
[0 - 10] = main.Resize(1920, 1080)
# Speed
[0 - 10] = main.Speed(1.5)  # 1.5x faster
# Loop
[0 - 10] = main.Loop(3)  # loop 3 times
Audio
# Volume
[0 - 10] = audio music, volume: 0.7
# Fade
[0 - 10] = audio music, fade_in: 1s, fade_out: 2s
# Trim audio
[0 - 10] = audio music.Trim(0, 10)
Text
# Basic text
[2 - 5] = text "Hello World"
# With styling
[2 - 5] = text "Hello", 
    style: title,
    position: center,
    color: #FFFFFF,
    stroke: #000000,
    stroke_width: 2,
    font: Inter,
    size: 48,
    animation: fade
# Style options
# style: title | subtitle | caption
# position: top | bottom | center | top-left | top-right | bottom-left | bottom-right
# animation: none | fade | slide | bounce | typewriter
Filters (GLSL)
# Built-in filters
[0 - 10] = filter "monochrome", intensity: 0.8
[0 - 10] = filter "sepia", intensity: 0.6
[0 - 10] = filter "blur", radius: 5
[0 - 10] = filter "chromatic", offset: 0.02
[0 - 10] = filter "glitch", intensity: 0.5
[0 - 10] = filter "vignette", intensity: 0.5
[0 - 10] = filter "contrast", amount: 1.2
[0 - 10] = filter "saturation", amount: 1.5
[0 - 10] = filter "brightness", amount: 0.1
# Custom shader
[0 - 10] = shader "my_effect", param1: value1, param2: value2
Composition
# Overlay (layer on top)
[0 - 10] = main.Overlay(logo, x: 100, y: 50)
[0 - 10] = main.Overlay(logo, x: center, y: bottom, opacity: 0.5)
# Composite (blend modes)
[0 - 10] = main.Composite(background, mode: multiply)
[0 - 10] = main.Composite(background, mode: screen)
[0 - 10] = main.Composite(background, mode: overlay)
# Concatenate
let final = clip1 + clip2
Output
# Basic output
output to "result.mp4"
# With options
output to "result.mp4", 
    format: mp4,
    resolution: 1080x1920,
    codec: h264,
    fps: 30,
    bitrate: 10M
Functions
fn fade_in(clip, duration: float, target: float = 1.0) {
    clip.Opacity(0, duration)
    clip.Opacity(target, duration)
}
fn apply_preset(clip, preset: string) {
    match preset {
        "cinematic" -> clip.LUT("cinema.cube").Grain(2)
        "vintage" -> clip.Saturation(0.7).Vignette()
        else -> clip
    }
}
# Usage
[0 - 10] = fade_in(main, 2s)
[0 - 10] = apply_preset(main, "cinematic")
Templates (Placeholders)
# Template file (creator writes)
input video = {{video_file}}
input music = {{music_file | "default.mp3"}}
[0 - {{duration | 30}}] = video
[0 - end] = audio music, volume: {{volume | 0.7}}
# User fills in
{{video_file}} = "my_video.mp4"
{{music_file}} = "song.mp3"
{{duration}} = 60
{{volume}} = 0.8
Comments
# Single line comment
/* Multi-line
   comment */
# TODO: Add more effects
# FIXME: Fix audio sync
Preset Resolutions
# Reels / TikTok (9:16)
output resolution: 1080x1920
# Square (Instagram)  
output resolution: 1080x1080
# YouTube landscape
output resolution: 1920x1080
# Vertical Stories
output resolution: 1080x1920
Full Example
# Wedding Reel Template
# Author: @creator
# === INPUTS ===
input main_video = {{video1}}
input music = {{audio1}}
# === PROCESS ===
# Trim to duration
[0s - {{duration | 30}}s] = main_video.Trim(0, {{duration | 30}})
# Apply effect if selected
[0s - end] = filter {{effect | "none"}}, intensity: {{effect_intensity | 0.5}}
# === AUDIO ===
[0s - end] = audio music, volume: {{music_volume | 0.7}}, fade_out: 2s
# === TEXT OVERLAYS ===
[1s - 4s] = text "{{title}}", 
    style: title, 
    position: center,
    animation: fade
[5s - end] = text "{{subtitle}}", 
    style: subtitle, 
    position: bottom-center,
    animation: slide
# === OUTPUT ===
output to "wedding-reel.mp4", resolution: 1080x1920
---
## File: 04-peggy-grammar.md
```markdown
# Peggy Grammar for VidScript
## Why Peggy?
- Fast PEG parser
- TypeScript-native
- Good error recovery
- Easy to extend
## Grammar File (vidscript.peggy)
```peggy
{
  // Helper functions
  function makeNode(type, props) {
    return { type, ...props, loc: location() };
  }
  
  function parseTime(str) {
    // Parse time strings like "0", "10s", "0:00", "0:00:00"
    const s = str.replace(/^\s+|\s+$/g, '');
    if (s.includes(':')) {
      const parts = s.split(':').map(p => parseInt(p, 10));
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (s.endsWith('ms')) return parseFloat(s) / 1000;
    if (s.endsWith('s')) return parseFloat(s.slice(0, -1));
    return parseFloat(s);
  }
}
Parser
  = _ statements:Statement* _ {
      return { type: 'Program', statements };
    }
Statement
  = Comment
  / ImportStatement
  / InputStatement
  / VariableAssignment
  / TimeBlock
  / OutputStatement
  / FunctionDef
  / EmptyStatement
Comment
  = "#" [^\n]* { return null; }
  / "/*" (!"*/" .)* "*/" { return null; }
EmptyStatement
  = _ { return null; }
//
// Import
//
ImportStatement
  = "import" _ "shader" _ name:Identifier _ "from" _ path:String {
      return { type: 'ImportShader', name, path };
    }
//
// Input
//
InputStatement
  = "input" _ name:Identifier _ "=" _ path:String {
      return { type: 'Input', name, path };
    }
//
// Variables
//
VariableAssignment
  = "let" _ name:Identifier _ "=" _ value:Expression {
      return { type: 'Variable', name, value };
    }
//
// Output
//
OutputStatement
  = "output" _ "to" _ path:String _ ","? _ options:OutputOptions? {
      return { type: 'Output', path, options: options || {} };
    }
OutputOptions
  = head:OutputOption tail:(_ "," _ OutputOption)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }
OutputOption
  = key:("format" / "resolution" / "codec" / "fps" / "bitrate") _ ":" _ value:(String / Identifier) {
      return { key, value };
    }
//
// Time Block
//
TimeBlock
  = "[" _ start:TimeSpec _ "-" _ end:TimeSpec "]" _ "=" _ instructions:InstructionList {
      return { type: 'TimeBlock', start, end, instructions };
    }
  / "[" _ start:TimeSpec _ "-" _ "end" "]" _ "=" _ instructions:InstructionList {
      return { type: 'TimeBlock', start, end: { value: Infinity }, instructions };
    }
TimeSpec
  = value:TimeValue { return { value, loc: location() }; }
TimeValue
  = num:Number _ unit:TimeUnit? {
      const unitMap = { s: 1, ms: 0.001, f: 1/30 };
      return num * (unitMap[unit] || 1);
    }
  / "frame" _ num:Number { return num / 30; }
  / "0:" min:Number ":" sec:Number { return min * 60 + sec; }
  / "0" ":" min:Number ":" sec:Number { return min * 60 + sec; }
  / hour:Number ":" min:Number ":" sec:Number { return hour * 3600 + min * 60 + sec; }
TimeUnit
  = "s" / "ms" / "f" / "sec" / "seconds"
//
// Instructions
//
InstructionList
  = head:Instruction tail:(_ "\n" _ Instruction)* {
      return [head, ...tail.map(t => t[3])];
    }
Instruction
  = VideoInstruction
  / AudioInstruction
  / TextInstruction
  / FilterInstruction
  / ShaderInstruction
  / CompositeInstruction
  / Expression
VideoInstruction
  = target:Identifier "." "Trim" _ "(" _ params:CallParams _ ")" {
      return { type: 'VideoTrim', target, params };
    }
  / target:Identifier "." "Resize" _ "(" _ width:Number _ "," _ height:Number _ ")" {
      return { type: 'VideoResize', target, width, height };
    }
  / target:Identifier "." "Speed" _ "(" _ factor:Number _ ")" {
      return { type: 'VideoSpeed', target, factor };
    }
  / target:Identifier "." "Loop" _ "(" _ count:Number _ ")" {
      return { type: 'VideoLoop', target, count };
    }
  / target:Identifier "." "Opacity" _ "(" _ value:Number _ "," _ duration:Number _ ")" {
      return { type: 'VideoOpacity', target, value, duration };
    }
AudioInstruction
  = "audio" _ name:Identifier _ "," _ params:AudioParams {
      return { type: 'Audio', name, params };
    }
AudioParams
  = head:AudioParam tail:(_ "," _ AudioParam)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }
AudioParam
  = key:("volume" / "fade_in" / "fade_out") _ ":" _ value:Number {
      return { key, value };
    }
TextInstruction
  = "text" _ content:String _ "," _ params:TextParams {
      return { type: 'Text', content, params };
    }
TextParams
  = head:TextParam tail:(_ "," _ TextParam)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }
TextParam
  = key:("style" / "position" / "color" / "stroke" / "stroke_width" / "font" / "size" / "animation") _ ":" _ value:(String / Identifier) {
      return { key, value };
    }
FilterInstruction
  = "filter" _ name:String _ "," _ params:FilterParams {
      return { type: 'Filter', name, params };
    }
FilterParams
  = head:FilterParam tail:(_ "," _ FilterParam)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }
FilterParam
  = key:Identifier _ ":" _ value:Number {
      return { key, value };
    }
ShaderInstruction
  = "shader" _ name:String _ "," _ params:ShaderParams {
      return { type: 'Shader', name, params };
    }
ShaderParams
  = head:ShaderParam tail:(_ "," _ ShaderParam)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }
ShaderParam
  = key:Identifier _ ":" _ value:(Number / String) {
      return { key, value };
    }
CompositeInstruction
  = target:Identifier "." "Overlay" _ "(" _ overlay:Identifier _ "," _ params:CompositeParams _ ")" {
      return { type: 'Overlay', target, overlay, params };
    }
  / target:Identifier "." "Composite" _ "(" _ other:Identifier _ "," _ params:CompositeParams _ ")" {
      return { type: 'Composite', target, other, params };
    }
CompositeParams
  = head:CompositeParam tail:(_ "," _ CompositeParam)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }
CompositeParam
  = key:("x" / "y" / "mode" / "opacity") _ ":" _ value:(Number / String / Identifier) {
      return { key, value };
    }
//
// Expressions
//
Expression
  = CallExpression
  / Identifier
  / String
  / Number
  / BinaryExpression
CallExpression
  = name:Identifier _ "(" _ params:CallParams? _ ")" {
      return { type: 'Call', name, params: params || [] };
    }
CallParams
  = head:ParamValue tail:(_ "," _ ParamValue)* {
      return tail.reduce((acc, item) => {
        if (typeof item[3] === 'object' && item[3].key) {
          return { ...acc, [item[3].key]: item[3].value };
        }
        return { ...acc, [item[3]] };
      }, head);
    }
ParamValue
  = key:Identifier _ ":" _ value:Value { return { key, value }; }
  / Value
Value
  = Number
  / String
  / Identifier
  / Boolean
BinaryExpression
  = left:Expression _ op:("+" / "-") _ right:Expression {
      return { type: 'Binary', op, left, right };
    }
//
// Function Definition
//
FunctionDef
  = "fn" _ name:Identifier _ "(" _ params:FunctionParams? _ ")" _ "{" _ body:Statement* _ "}" {
      return { type: 'Function', name, params: params || [], body };
    }
FunctionParams
  = head:FunctionParam tail:(_ "," _ FunctionParam)* {
      return [head, ...tail.map(t => t[3])];
    }
FunctionParam
  = name:Identifier _ ":" _ type:Identifier _ default:(_ "=" _ Value)? {
      return { name, type, default: default ? default[3] : null };
    }
//
// Primitives
//
Identifier
  = name:[a-zA-Z_][a-zA-Z0-9_]* { return name.join(''); }
Number
  = num:([0-9]+ ("." [0-9]+)?) { return parseFloat(num.join('')); }
String
  = '"' chars:([^"\\] / "\\" .)* '"' { return chars.join(''); }
  / "'" chars:([^'\\] / "\\" .)* "'" { return chars.join(''); }
Boolean
  = "true" { return true; }
  / "false" { return false; }
_ "whitespace"
  = [ \t\r\n]*
AST Nodes
type ASTNode =
  | { type: 'Program'; statements: ASTNode[] }
  | { type: 'Input'; name: string; path: string }
  | { type: 'Variable'; name: string; value: ASTNode }
  | { type: 'TimeBlock'; start: number; end: number; instructions: ASTNode[] }
  | { type: 'VideoTrim'; target: string; params: object }
  | { type: 'Audio'; name: string; params: object }
  | { type: 'Text'; content: string; params: object }
  | { type: 'Filter'; name: string; params: object }
  | { type: 'Shader'; name: string; params: object }
  | { type: 'Output'; path: string; options: object }
  | { type: 'Function'; name: string; params: object[]; body: ASTNode[] }
  | { type: 'ImportShader'; name: string; path: string };
Usage
import { parser } from './vidscript';
const code = `
  input video = "test.mp4"
  [0 - 10] = video.Filter("monochrome", intensity: 0.8)
`;
const ast = parser.parse(code);
console.log(JSON.stringify(ast, null, 2));
---
## File: 05-webgl-pipeline.md
```markdown
# WebGL Rendering Pipeline
## Overview
- **Preview**: Browser-based Three.js + WebGL (720p)
- **Export**: Server-side headless-gl + WebCodecs (1080p)
## Architecture
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   VidScript    │────▶│     Parser      │────▶│   AST (JSON)    │
│   (Text)       │     │    (Peggy)      │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                         ┌───────────────────────────────┘
                         ▼
                ┌─────────────────┐     ┌─────────────────┐
                │  Scene Builder  │────▶│  Three.js Scene │
                │                 │     │                 │
                └─────────────────┘     └────────┬────────┘
                                                 │
                         ┌───────────────────────┴────────┐
                         ▼                                ▼
              ┌──────────────────┐          ┌──────────────────┐
              │   BROWSER        │          │   WORKER         │
              │                  │          │                  │
              │ ┌──────────────┐ │          │ ┌──────────────┐ │
              │ │Three.js      │ │          │ │headless-gl   │ │
              │ │WebGLRenderer │ │          │ │WebGLRenderer │ │
              │ └──────────────┘ │          │ └──────────────┘ │
              │ ┌──────────────┐ │          │ ┌──────────────┐ │
              │ │ EffectComposer│ │          │ │EffectComposer│ │
              │ │ (Shaders)    │ │          │ │ (Shaders)    │ │
              │ └──────────────┘ │          │ └──────────────┘ │
              │ ┌──────────────┐ │          │ ┌──────────────┐ │
              │ │Canvas Element │ │          │ │ readPixels   │ │
              │ │(720p preview) │ │          │ │(Frame data)  │ │
              │ └──────────────┘ │          │ └──────────────┘ │
              └──────────────────┘          │ ┌──────────────┐ │
                                           │ │ WebCodecs    │ │
                                           │ │ (H.264 enc)  │ │
                                           │ └──────────────┘ │
                                           └──────────────────┘
## Preview (Browser)
```typescript
// preview-engine.ts
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
export class PreviewEngine {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private videos: Map<string, THREE.VideoTexture> = new Map();
  private currentFrame = 0;
  
  constructor(width: number = 1280, height: number = 720) {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    // Orthographic camera for 2D video
    this.camera = new THREE.OrthographicCamera(
      0, width, 0, height, 0.1, 1000
    );
    this.camera.position.z = 1;
    
    // WebGL renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      preserveDrawingBuffer: true 
    });
    this.renderer.setSize(width, height);
    
    // Effect composer for shaders
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
  }
  
  // Load video as texture
  async loadVideo(path: string, name: string): Promise<void> {
    const video = document.createElement('video');
    video.src = path;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.play();
    
    await new Promise(resolve => {
      video.oncanplay = resolve;
    });
    
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    
    this.videos.set(name, texture);
  }
  
  // Apply shader effect
  applyShader(shader: ShaderDefinition): void {
    const pass = new ShaderPass(shader);
    this.composer.addPass(pass);
  }
  
  // Render frame
  render(): void {
    this.composer.render();
  }
  
  // Get canvas for display
  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }
}
Server-Side Render (Headless)
// render-worker.ts
import { createGL } from 'gl';
import * as THREE from 'three';
import { VideoEncoder } from 'webcodecs';
export class RenderWorker {
  private gl: WebGLRenderingContext;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private encoder: VideoEncoder;
  private frames: EncodedVideoChunk[] = [];
  
  constructor(width: number, height: number) {
    // Headless WebGL
    this.gl = createGL(width, height, {
      preserveDrawingBuffer: true,
      alpha: false,
      antialias: false
    });
    
    // Three.js with headless context
    this.renderer = new THREE.WebGLRenderer({
      canvas: { 
        width, 
        height, 
        getContext: () => this.gl 
      } as any
    });
    this.renderer.setSize(width, height);
    
    this.scene = new THREE.Scene();
    
    // WebCodecs encoder
    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        this.frames.push(chunk);
      },
      error: (e) => console.error(e)
    });
    
    this.encoder.configure({
      codec: 'avc1.42001E',
      width,
      height,
      bitrate: 10_000_000,
      framerate: 30
    });
  }
  
  async renderFrame(time: number): Promise<void> {
    // Update video textures to time
    this.updateVideoTime(time);
    
    // Render
    this.renderer.render(this.scene, this.camera);
    
    // Read pixels
    const pixels = new Uint8Array(1920 * 1080 * 4);
    this.gl.readPixels(0, 0, 1920, 1080, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
    
    // Encode
    const frame = new VideoFrame(pixels, {
      timestamp: time * 1_000_000 / 30,
      codedWidth: 1920,
      codedHeight: 1080
    });
    
    this.encoder.encode(frame);
  }
  
  async finalize(): Promise<Blob> {
    await this.encoder.flush();
    
    // Convert chunks to blob
    return new Blob(this.frames.map(f => f.data), { type: 'video/mp4' });
  }
}
GLSL Shader System
// Standard vertex shader
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// Monochrome filter
const monochromeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uIntensity: { value: 0.8 }
  },
  vertexShader,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      vec3 mono = vec3(gray);
      gl_FragColor = vec4(mix(color.rgb, mono, uIntensity), color.a);
    }
  `
};
// Chromatic aberration
const chromaticShader = {
  uniforms: {
    tDiffuse: { value: null },
    uOffset: { value: 0.02 }
  },
  vertexShader,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uOffset;
    varying vec2 vUv;
    
    void main() {
      vec2 dir = vUv - vec2(0.5);
      float d = length(dir);
      vec2 offset = dir * d * uOffset;
      
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `
};
Custom Shader Import
// Import user's custom GLSL
async function loadCustomShader(path: string): Promise<THREE.ShaderMaterial> {
  const response = await fetch(path);
  const glsl = await response.text();
  
  // Parse shader definition
  const uniforms = parseUniforms(glsl);
  const fragmentShader = extractFragmentShader(glsl);
  
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader
  });
}
function parseUniforms(glsl: string): Record<string, any> {
  const uniforms: Record<string, any> = { tDiffuse: { value: null } };
  
  // Extract uniform declarations
  const matches = glsl.matchAll(/uniform\s+(\w+)\s+(\w+)/g);
  for (const match of matches) {
    const [, type, name] = match;
    if (type === 'float') uniforms[name] = { value: 0.5 };
    if (type === 'int') uniforms[name] = { value: 1 };
    if (type === 'vec2') uniforms[name] = { value: new THREE.Vector2() };
    if (type === 'vec3') uniforms[name] = { value: new THREE.Vector3() };
    if (type === 'vec4') uniforms[name] = { value: new THREE.Vector4() };
  }
  
  return uniforms;
}
---
## File: 06-database-schema.md
```markdown
# Database Schema
## PostgreSQL with Prisma
```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String?
  password  String?
  credits   Int       @default(5)
  isCreator Boolean   @default(false)
  stripeConnectId String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  templates   Template[]
  assets      Asset[]
  shaders    Shader[]
  renders    Render[]
  purchases  Purchase[]
}
model Template {
  id          Int       @id @default(autoincrement())
  creatorId   Int
  creator     User      @relation(fields: [creatorId], references: [id])
  title       String
  description String?
  thumbnailUrl String?
  vidscript   String    @db.Text
  placeholders Json?
  defaultValues Json?
  priceCents  Int       @default(0)
  category    String?
  tags        String[]
  downloads   Int       @default(0)
  ratingAvg   Float     @default(0)
  status      String    @default("draft") // draft, published
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  renders     Render[]
  purchases   Purchase[]
}
model Asset {
  id        Int       @id @default(autoincrement())
  userId    Int
  user      User      @relation(fields: [userId], references: [id])
  filename  String
  filepath  String
  fileType  String    // video, audio, image
  fileSize  BigInt
  duration  Float?
  width     Int?
  height    Int?
  createdAt DateTime  @default(now())
  
  @@index([userId])
}
model Shader {
  id        Int       @id @default(autoincrement())
  userId    Int
  user      User      @relation(fields: [userId], references: [id])
  name      String
  glslCode  String    @db.Text
  uniforms  Json?
  createdAt DateTime  @default(now())
  
  @@unique([userId, name])
}
model Render {
  id          Int       @id @default(autoincrement())
  userId      Int
  user        User      @relation(fields: [userId], references: [id])
  templateId  Int?
  template    Template? @relation(fields: [templateId], references: [id])
  vidscript   String    @db.Text
  placeholders Json?
  status      String    @default("pending") // pending, processing, completed, failed
  progress    Int       @default(0)
  resolution  String    @default("1080x1920")
  outputPath  String?
  errorMessage String?
  creditsUsed Int       @default(1)
  createdAt   DateTime  @default(now())
  completedAt DateTime?
  
  @@index([userId])
  @@index([status])
}
model Purchase {
  id        Int       @id @default(autoincrement())
  buyerId   Int
  buyer     User      @relation(fields: [buyerId], references: [id])
  templateId Int
  template  Template  @relation(fields: [templateId], references: [id])
  amountCents Int
  platformFeeCents Int?
  creatorPayoutCents Int?
  createdAt DateTime  @default(now())
  
  @@unique([buyerId, templateId])
}
SQL Migration
-- Run with: npx prisma migrate dev --name init
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password VARCHAR(255),
  credits INTEGER DEFAULT 5,
  is_creator BOOLEAN DEFAULT false,
  stripe_connect_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
-- Templates table
CREATE TABLE templates (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  vidscript TEXT NOT NULL,
  placeholders JSONB,
  default_values JSONB,
  price_cents INTEGER DEFAULT 0,
  category VARCHAR(50),
  tags TEXT[],
  downloads INTEGER DEFAULT 0,
  rating_avg DECIMAL(2,1) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
-- Assets table
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  filename VARCHAR(255),
  filepath VARCHAR(500),
  file_type VARCHAR(20),
  file_size BIGINT,
  duration_seconds DECIMAL(10,2),
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
-- Shaders table
CREATE TABLE shaders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  glsl_code TEXT NOT NULL,
  uniforms JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);
-- Renders table
CREATE TABLE renders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  template_id INTEGER REFERENCES templates(id),
  vidscript TEXT NOT NULL,
  placeholders JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  resolution VARCHAR(20) DEFAULT '1080x1920',
  output_path VARCHAR(500),
  error_message TEXT,
  credits_used INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
-- Purchases table
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  buyer_id INTEGER REFERENCES users(id),
  template_id INTEGER REFERENCES templates(id),
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER,
  creator_payout_cents INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(buyer_id, template_id)
);
---
## File: 07-api-spec.md
```markdown
# API Specification
## Base URL
/api/v1
## Authentication
- NextAuth.js with credentials provider
- JWT tokens
## Endpoints
### Auth
POST   /api/v1/auth/register     # Register new user
POST   /api/v1/auth/login        # Login
POST   /api/v1/auth/logout       # Logout
GET    /api/v1/auth/me           # Get current user
POST   /api/v1/auth/credits     # Add credits (admin)
### Templates
GET    /api/v1/templates         # List templates (public)
GET    /api/v1/templates/:id     # Get template
POST   /api/v1/templates         # Create template (creator)
PUT    /api/v1/templates/:id    # Update template
DELETE /api/v1/templates/:id    # Delete template
POST   /api/v1/templates/:id/purchase  # Purchase template
### Assets
GET    /api/v1/assets           # List user assets
POST   /api/v1/assets/upload    # Upload asset
DELETE /api/v1/assets/:id      # Delete asset
### Shaders
GET    /api/v1/shaders          # List user shaders
GET    /api/v1/shaders/:id     # Get shader
POST   /api/v1/shaders         # Create shader
PUT    /api/v1/shaders/:id     # Update shader
DELETE /api/v1/shaders/:id    # Delete shader
### Renders
GET    /api/v1/renders          # List user renders
GET    /api/v1/renders/:id     # Get render status
POST   /api/v1/renders         # Start render job
DELETE /api/v1/renders/:id    # Cancel render
GET    /api/v1/renders/:id/download  # Download result
### Preview
POST   /api/v1/preview          # Generate preview (low-res)
## Request/Response Examples
### Register
```bash
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
Response:
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "credits": 5
  },
  "token": "jwt-token-here"
}
Create Render
POST /api/v1/renders
{
  "vidscript": "input video = \"test.mp4\"\n[0-10] = video",
  "resolution": "1080x1920"
}
Response:
{
  "id": 1,
  "status": "pending",
  "progress": 0
}
Get Render Status
GET /api/v1/renders/1
Response:
{
  "id": 1,
  "status": "processing",
  "progress": 75,
  "outputPath": "/renders/1/output.mp4"
}
WebSocket Events
# Progress updates
ws://server/renders/:id
{ "type": "progress", "progress": 75 }
{ "type": "completed", "outputUrl": "/downloads/1.mp4" }
{ "type": "failed", "error": "Error message" }
---
## File: 08-llm-agent.md
```markdown
# LLM Agent Skill
## Overview
Users provide their own OpenAI API key. The LLM assists with:
1. Translating natural language to VidScript
2. Explaining errors and suggesting fixes
3. Auto-completing code
## Agent Prompt
You are a VidScript expert. Help users create videos using the VidScript DSL.
VidScript Syntax
Time Format
- 0 - 10 means 0 to 10 seconds
- 0s - 10s explicit seconds
- 0:00 - 0:10 mm:ss format
Basic Instructions
# Input files
input video = "file.mp4"
input audio = "sound.mp3"
# Video operations
[0 - 10] = video.Trim(0, 300)      # trim to frames
[0 - 10] = video.Resize(1920, 1080)
[0 - 10] = video.Speed(1.5)
# Audio
[0 - 10] = audio music, volume: 0.7
[0 - 10] = audio music, fade_in: 1s, fade_out: 2s
# Text
[2 - 5] = text "Hello", style: title, position: center
# Filters (GLSL)
[0 - 10] = filter "monochrome", intensity: 0.8
[0 - 10] = filter "sepia", intensity: 0.6
# Output
output to "result.mp4", resolution: 1080x1920
Built-in Filters
- monochrome, sepia, blur, chromatic, glitch
- vignette, contrast, saturation, brightness
Custom GLSL
Users can import their own shaders:
import shader "my_effect" from "./shaders/neon.glsl"
[0 - 10] = shader "my_effect", param1: value1
Your Task
When user describes what they want:
1. Write valid VidScript code
2. Explain what the code does
3. If unclear, ask for clarification
When user has errors:
1. Explain the error in plain language
2. Show corrected code
Examples
User: "Add my wedding video with fade in and some music"
input video = "wedding.mp4"
input music = "song.mp3"
[0 - 2] = video.Opacity(0, 2)
[2 - 10] = video.Opacity(1, 1)
[0 - 10] = audio music, volume: 0.6, fade_out: 2s
User: "Put text 'Welcome' in the center with a title style"
[0 - 5] = text "Welcome", style: title, position: center
User: "Apply a vintage filter to my video"
[0 - end] = filter "sepia", intensity: 0.6
[0 - end] = filter "vignette", intensity: 0.3
Remember: Always write valid, executable VidScript code.
## Integration
```typescript
// llm-service.ts
import OpenAI from 'openai';
export class LLMService {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async generateVidScript(userMessage: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3
    });
    
    return response.choices[0].message.content;
  }
  
  async explainError(error: string, code: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: ERROR_EXPLANATION_PROMPT },
        { role: 'user', content: `Error: ${error}\nCode:\n${code}` }
      ],
      temperature: 0.3
    });
    
    return response.choices[0].message.content;
  }
}
const SYSTEM_PROMPT = `You are a VidScript expert...`; // from above
const ERROR_EXPLANATION_PROMPT = `
Explain this VidScript error in plain language and show corrected code.
The user is a beginner, so keep explanations simple.
`;
---
## File: 09-shader-library.md
```markdown
# Built-in GLSL Shaders
## Overview
v1 includes these built-in filters. Users can also import custom GLSL shaders.
## Filter Library
### 1. Monochrome
```glsl
// Converts to grayscale
filter "monochrome", intensity: 0-1
2. Sepia
// Vintage brown tone
filter "sepia", intensity: 0-1
3. Blur
// Gaussian blur
filter "blur", radius: 0-20
4. Chromatic Aberration
// RGB channel separation
filter "chromatic", offset: 0-0.1
5. Glitch
// Digital glitch effect
filter "glitch", intensity: 0-1
6. Vignette
// Darken edges
filter "vignette", intensity: 0-1
7. Contrast
// Adjust contrast
filter "contrast", amount: 0-2
8. Saturation
// Adjust color saturation
filter "saturation", amount: 0-2
9. Brightness
// Adjust brightness
filter "brightness", amount: -1 to 1
Custom Shader Format
Users can import their own GLSL:
// my-shader.glsl
// Uniforms are auto-detected
uniform float uIntensity;
uniform vec3 uColor;
void main() {
  vec2 uv = vUv;
  vec4 color = texture2D(tDiffuse, uv);
  
  // Custom effect logic
  color.rgb = mix(color.rgb, uColor, uIntensity);
  
  gl_FragColor = color;
}
Popular Shader Libraries
Shadertoy
- shadertoy.com - Huge collection of shaders
- Can be ported to ReelForge
lygia
- github.com/lygia/lygia - Modern shader library
- Granular, composable effects
glslViewer
- github.com/patriciogonzalezvivo/glslViewer
- Live GLSL previewer
FreeShaderPack
- Various free shader collections
Shader Conversion Guide
When users import shaders:
1. Auto-detect uniforms
2. Add tDiffuse uniform for input texture
3. Add vUv varying for texture coordinates
4. Wrap fragment shader in main() function
---
## File: 10-sample-files/wedding-reel.vs
```vidscript
# Wedding Reel Template
# Created by: @creator
# Usage: Replace placeholders with your files
# === INPUTS ===
input main_video = {{video_file}}
input music = {{music_file | "default.mp3"}}
# === CONFIG ===
let duration = {{duration | 30}}
let effect = {{effect | "none"}}
let effect_intensity = {{effect_intensity | 0.5}}
let music_volume = {{music_volume | 0.7}}
# === PROCESS VIDEO ===
# Trim video to selected duration
[0s - duration] = main_video.Trim(0, duration)
# Apply selected effect
[0s - end] = filter effect, intensity: effect_intensity
# === AUDIO ===
[0s - end] = audio music, volume: music_volume, fade_out: 3s
# === TEXT OVERLAYS ===
# Title
[1s - 4s] = text "{{title_text | The Wedding}}", 
    style: title,
    position: center,
    animation: fade,
    color: white,
    stroke: black,
    stroke_width: 2
# Subtitle
[5s - end] = text "{{subtitle_text | Mr. & Mrs. Smith}}",
    style: subtitle,
    position: bottom-center,
    animation: slide,
    color: #FFE4B5
# === OUTPUT ===
output to "wedding-reel.mp4", 
    resolution: 1080x1920,
    fps: 30
File: 10-sample-files/custom-effect.vs
# Custom Shader Example
# Import and use custom GLSL shader
# Import custom shader
import shader "neon-glow" from "./shaders/neon.glsl"
# Input video
input video = "dance.mp4"
# Apply custom shader
[0s - 10s] = video.Trim(0, 300)
[0s - 10s] = shader "neon-glow", 
    glow_intensity: 0.8,
    glow_color: "#00FF00"
# Add music
input music = "upbeat.mp3"
[0s - 10s] = audio music, volume: 0.6
# Output
output to "neon-dance.mp4", resolution: 1080x1920
File: 10-sample-files/user-workflow.vs
# User Workflow Example
# This is what a user creates from scratch
# Step 1: Add your video
input my_video = "vacation.mp4"
# Step 2: Trim to 30 seconds
[0s - 30s] = my_video.Trim(0, 30)
# Step 3: Add a filter
[0s - 30s] = filter "sepia", intensity: 0.4
[0s - 30s] = filter "vignette", intensity: 0.3
# Step 4: Add background music
input bg_music = "chill-music.mp3"
[0s - 30s] = audio bg_music, volume: 0.5, fade_in: 1s
# Step 5: Add text
[2s - 5s] = text "My Vacation", 
    style: title,
    position: center,
    color: white,
    stroke: black
[6s - 30s] = text "Summer 2024",
    style: subtitle,
    position: bottom-center,
    animation: fade
# Step 6: Export
output to "my-reel.mp4", resolution: 1080x1920
---
File: 11-research/webgl-headless.md
 Research: Headless WebGL
 Option 1: headless-gl (Recommended)
- NPM: `gl` package
- WebGL 1.0
- Used by Figma
- Prebuilt binaries for Node 20/22
- Production-ready
const createGL = require('gl');
const gl = createGL(1920, 1080);
gl.clearColor(1, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT);
Option 2: node-canvas-webgl
- Integrates headless-gl with node-canvas
- Works with Three.js
Option 3: Puppeteer + Chromium
- Uses browser's GPU rendering
- Can capture screenshots per frame
- Slower but more compatible
Comparison
| Approach | GPU | Setup | Performance |
|----------|-----|-------|-------------|
| headless-gl | Yes | Medium | Fast |
| Puppeteer | Yes | Easy | Medium |
| FFmpeg.wasm | Limited | Hard | Slow |
Recommendation
Use headless-gl + Three.js for v1.
---
## File: 11-research/ffmpeg-glsl.md
```markdown
# Research: FFmpeg GLSL Support
## Direct GLSL Support
FFmpeg doesn't have native GLSL support, but:
### Option 1: libplacebo (FFmpeg 6.0+)
```bash
ffmpeg -i input.mp4 -vf "libplacebo=glsl_shader='...'" output.mp4
Option 2: Custom Filter (Build from source)
Requires compiling FFmpeg with custom filter.
Option 3: OpenCL Filters
FFmpeg has OpenCL filters:
ffmpeg -i input.mp4 -vf "hwupload,scale_opencl=1920:1080,hwdownload"
Recommendation
Don't use FFmpeg for effects. Use WebGL pipeline instead.
FFmpeg only for final encoding via WebCodecs.
---
## File: 11-research/video-dsls.md
```markdown
# Research: Video DSLs
## Avisynth
- Old but elegant syntax
- Implicit `last` variable
- Method chaining
## VapourSynth
- Python-based
- Excellent plugin ecosystem
- Powerful but complex
## Shadertoy
- Simple uniforms API
- Per-pixel execution
- Multiple input channels
## Our Design
- Inspired by Avisynth simplicity
- Explicit variables (no implicit `last`)
- Time-block syntax `[start - end]`
- LLM-friendly
---
File: 12-cost-analysis.md
 Cost Analysis
 Infrastructure (Hetzner)
| Item | Specification | Monthly Cost |
|------|---------------|--------------|
| CCX33 | 8 vCPU, 32GB RAM, 240GB NVMe | €48.49 |
| Backup | Optional | +€10 |
| **Total** | | **€48-60/mo** |
 What €50 Gets You
- Next.js web app
- PostgreSQL database
- File storage (240GB)
- FFmpeg/headless-gl rendering
- 30TB bandwidth
 Scaling
- 10k users @ 50 renders/mo = ~500k renders
- Each render ~30 seconds on 8 cores
- 500k × 30s = 4,166 render-hours/month
- At 8 concurrent: ~520 hours/month
- Single server handles ~500-1000 concurrent renders/day
 If You Need More
- Add more Hetzner servers (€50 each)
- Each server adds ~500 renders/day capacity
 Revenue (Future)
- Free: 5 credits signup
- $0.10-0.25 per export
- Template sales: 25% platform fee
---
File: 13-roadmap.md
 Implementation Roadmap
 Phase 1: Foundation (Week 1-2)
- [ ] Set up Hetzner server
- [ ] Install Node.js, Bun, PostgreSQL
- [ ] Create Next.js project
- [ ] Set up Prisma schema
- [ ] Configure NextAuth
- [ ] Basic file upload
 Phase 2: Parser (Week 3-4)
- [ ] Write Peggy grammar
- [ ] Parser tests
- [ ] AST validation
- [ ] Error reporting
- [ ] Basic interpreter
 Phase 3: WebGL Engine (Week 5-6)
- [ ] headless-gl setup
- [ ] Three.js scene builder
- [ ] Video texture loading
- [ ] Shader system
- [ ] Frame rendering
 Phase 4: Preview (Week 7-8)
- [ ] Browser preview component
- [ ] 720p real-time preview
- [ ] Timeline visualization
- [ ] Playback controls
 Phase 5: Export (Week 9-10)
- [ ] WebCodecs encoder
- [ ] 1080p export
- [ ] Progress tracking
- [ ] Download handling
 Phase 6: Templates (Week 11)
- [ ] Template CRUD
- [ ] Placeholder system
- [ ] Gallery UI
 Phase 7: LLM (Week 12)
- [ ] LLM service integration
- [ ] Chat UI
- [ ] Code completion
 Phase 8: Polish (Week 13-14)
- [ ] Error handling
- [ ] UI refinement
- [ ] Testing
- [ ] Documentation
---
