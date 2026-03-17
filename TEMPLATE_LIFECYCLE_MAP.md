# Template-Lifecycle Implementation Map

## 1. Prisma Schema for Template and Related Models

**File:** `/Users/nidheeshdas/Sources/tm/created/prisma/schema.prisma` (lines 34-55)

### Template Model
```prisma
model Template {
  id            Int       @id @default(autoincrement())
  creatorId     Int
  creator       User      @relation(fields: [creatorId], references: [id])
  title         String
  description   String?
  thumbnailUrl  String?
  vidscript     String    @db.Text
  placeholders  Json?
  defaultValues Json?
  priceCents    Int       @default(0)
  category      String?
  tags          String[]
  downloads     Int       @default(0)
  ratingAvg     Float     @default(0)
  status        String    @default("draft")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  renders    Render[]
  purchases  Purchase[]
}
```

### Related Models
- **User** (lines 10-32): Creator reference with `templates` relation
- **Render** (lines 90-110): Has optional `templateId` FK and template relation for template-based renders
- **Purchase** (lines 112-124): Links users to templates with pricing info

### Key Constraints
- `placeholders` stored as JSON (extracted from vidscript using regex)
- `defaultValues` stored as JSON (user overrides for placeholders)
- `status` field (default "draft") for template lifecycle management
- No unique constraint on title (allows duplicate names)

---

## 2. Auth/Session Helpers and API Route Patterns

**Auth File:** `/Users/nidheeshdas/Sources/tm/created/src/lib/auth/index.ts`

### NextAuth Configuration
- **Provider:** Credentials (email/password) + GitHub + Google OAuth
- **Adapter:** PrismaAdapter
- **Session Strategy:** JWT
- **Strategy:** Uses server sessions with `getServerSession(authOptions)`

### Auth Session Callback
```typescript
// jwt callback adds custom fields
token.id = user.id (from User.id, converted to string)
token.credits = user.credits
token.isCreator = user.isCreator

// session callback enriches session.user
session.user.id, session.user.credits, session.user.isCreator
```

### Key Helper Pattern

**File:** `/Users/nidheeshdas/Sources/tm/created/src/lib/account/account-notices.ts`

Provides `AccountNotice` interface and error message mapping for OAuth connection flows.

### API Route Pattern (Authentication & Authorization)

All API routes follow this pattern:

```typescript
// 1. Get server session
const session = await getServerSession(authOptions);

// 2. Check auth
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// 3. Parse userId
const userId = parseInt(session.user.id);

// 4. Operate on database with userId
const resource = await prisma.[Model].findMany({ where: { userId } });
```

**Examples:**
- **GET `/api/account/profile`** (lines 8-38): Fetches user profile with selected fields
- **PUT `/api/account/profile`** (lines 40-70): Updates user.name
- **GET/POST `/api/account/api-keys`**: Manages encrypted LLM provider keys
- **DELETE `/api/account/api-keys/[id]`**: Removes API keys
- **GET/DELETE `/api/account/connections`**: Manages OAuth connections

### Encryption Helpers
- **File:** `/Users/nidheeshdas/Sources/tm/created/src/lib/auth/encryption.ts`
- Used to encrypt API keys and OAuth tokens before storage

---

## 3. Editor Page Logic, Import/Handoff, and Placeholder Extraction

**File:** `/Users/nidheeshdas/Sources/tm/created/src/app/editor/page.tsx` (762 lines)

### Page Structure
- **Sidebar Layout:** 360px fixed left sidebar + main editor area
- **State Management:** React hooks (useState, useCallback, useEffect, useMemo)
- **Code Validation:** Uses `validateVidscript()` from parser
- **Preview System:** Separate preview code state with nonce-based refresh

### Import/Handoff Mechanism (lines 189-200)

```typescript
// On mount, check for localStorage handoff from template detail page
useEffect(() => {
  const imported = localStorage.getItem('vidscript_import');
  if (imported) {
    const validation = applyDraftCode(imported);
    if (validation.errors.length === 0) {
      syncPreview(imported);
    }
    localStorage.removeItem('vidscript_import');
  }
}, [applyDraftCode, syncPreview]);
```

**Flow:** Template detail page → `localStorage.setItem('vidscript_import', code)` → Navigate to editor → Editor detects & applies

### Placeholder Extraction (lines 4, 174)

**Parser Location:** `/Users/nidheeshdas/Sources/tm/created/src/parser/index.ts` (lines 40-50)

```typescript
export function extractPlaceholders(code: string): string[] {
  const placeholderRegex = /\{\{(\w+)(?:\s*\|\s*([^}]+))?\}\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = placeholderRegex.exec(code)) !== null) {
    placeholders.push(match[1]);
  }
  
  return Array.from(new Set(placeholders));
}
```

**Usage in Editor:**
- Line 174: `setPlaceholders(extractPlaceholders(nextCode))` on every code change
- Stored in state for display/validation

### Key Editor Functions

1. **`applyDraftCode(nextCode)`** (lines 170-176): Updates code + validates + extracts placeholders
2. **`syncPreview(nextCode)`** (lines 177-180): Updates preview code + increments nonce
3. **`handleCodeChange()`** (lines 225-229): Event handler for textarea changes
4. **`handlePreview()`** (lines 231-240): Validates and syncs preview
5. **`handleExport()`** (lines 324-403): Renders to video via `/api/render` POST, polls status, downloads MP4

### Project Settings Management

**Functions:**
- `readProjectSettingsFromForm()` (lines 60-68): Extracts form data
- `readProjectSettingsForm()` (lines 70-86): Parses vidscript output statement
- `upsertOutputStatement()` (lines 88-111): Inserts or updates `output to` line in script

**Canvas Presets** (lines 44-48):
- Reel: 1080x1920 (9:16)
- Square: 1080x1080 (1:1)
- Landscape: 1920x1080 (16:9)

### Default Code (lines 20-42)
Contains sample VidScript with `/samples/test-video.mp4` and `/samples/test-audio.mp3`

---

## 4. Account Page Structure and "My Templates" Integration Point

**File:** `/Users/nidheeshdas/Sources/tm/created/src/app/account/page.tsx` (932 lines)

### Page Sections

1. **Unauthenticated View** (lines 503-546):
   - Hero banner with sign-in CTA
   - "What you can manage here" card
   - Connection cards (GitHub, Google Drive, Dropbox)

2. **Authenticated View** (lines 547-932+):
   - **Header** (lines 550-592):
     - Avatar with initials fallback
     - User email display
     - Quick action buttons ("Open editor", "Manage assets")
     - Stats grid: API key count, connected services count, available integrations
   
   - **Setup Status Card** (lines 594-618):
     - Token storage info
     - Cloud access status
     - R2 storage planned feature note
   
   - **Tabs** (lines 623-932):
     - **Profile Tab** (lines 639-718): Display name + email, avatar
     - **API Keys Tab** (lines 720-830+): Add/list LLM provider keys
     - **Connections Tab** (lines 830+): Connection cards for GitHub, Google Drive, Dropbox

### Data Loading Pattern (lines 173-203)

```typescript
const loadData = async () => {
  const [keysRes, connRes] = await Promise.all([
    fetch('/api/account/api-keys'),
    fetch('/api/account/connections'),
  ]);
  // ... handle responses
};
```

### UI Patterns
- **Error Handling:** `readResponseError()` helper (lines 113-129) extracts error messages from API responses
- **Success/Error Notices:** `AccountNotice` toast-like UI (lines 362-393)
- **Styled Cards:** `sectionCardClass` constant with dark theme
- **Tab Styling:** `tabTriggerClass` constant for active/inactive states

### "My Templates" Integration Point

**Optimal Location:** As a new tab in the tabs section (after "Connections" or as a separate card section)

**Layout Options:**
1. **Option A (Recommended):** New tab in existing TabsList (line 623)
   - Would be `<TabsTrigger value="templates">` alongside Profile, API Keys, Connections
   - Content: Grid of user's created templates with edit/view/delete actions
   
2. **Option B:** Separate card section after tabs
   - Placed after line 900+ after all tabs close
   - Cleaner separation from account management

### Key Props/State to Extend
- Add `templates` state (line 137-138 pattern)
- Add template loading to `loadData()` with 3rd API call
- Add template action handlers (delete, publish, unpublish, etc.)

---

## 5. Templates Library/Detail Pages and Sample Data

### Templates Library Page
**File:** `/Users/nidheeshdas/Sources/tm/created/src/app/templates/page.tsx` (226 lines)

**Sample Data:**
- Hardcoded `SAMPLE_TEMPLATES` array (lines 7-72) with 3 templates:
  1. Wedding Reel ($5, 1234 downloads)
  2. Travel Vlog (Free, 5678 downloads)
  3. Fitness Promo ($3, 890 downloads)

**Page Structure:**
- Header with navigation
- Hero section with stats
- 3-column grid of template cards
- Each card shows:
  - Category emoji background
  - Title + description
  - Price (free or "$X.XX")
  - Download count
  - "Use Template" button linking to `/templates/[id]`

**Visual Config:**
- `TEMPLATE_VISUALS` object (lines 74-90) maps category → badge + gradient + emoji

### Template Detail Page (Placeholder Form)
**File:** `/Users/nidheeshdas/Sources/tm/created/src/app/templates/[id]/page.tsx` (248 lines)

**State:**
- `params.id` from URL
- `values` object tracking placeholder inputs
- `template` lookup from hardcoded `TEMPLATES` record

**Sample Template Structure (lines 12-41):**
```typescript
{
  id: 1,
  title: 'Wedding Reel',
  description: '...',
  price: 5,
  vidscript: `# Wedding Reel Template\n...`,
  placeholders: [
    { name: 'video1', type: 'video', label: 'Main Video', required: true },
    { name: 'music', type: 'audio', label: 'Background Music', required: false },
    { name: 'duration', type: 'number', label: 'Duration (seconds)', default: 30 },
    { name: 'effect', type: 'select', label: 'Effect', options: [...], default: 'sepia' },
    { name: 'volume', type: 'number', label: 'Music Volume', default: 0.6 },
    { name: 'title', type: 'text', label: 'Title Text', default: 'The Wedding' },
    { name: 'subtitle', type: 'text', label: 'Subtitle', default: 'Mr. & Mrs. Smith' },
  ],
}
```

**Placeholder Input Types:**
- `text`: Input field
- `number`: Numeric input
- `select`: Dropdown with options
- `video`: File upload with accept="video/*"
- `audio`: File upload with accept="audio/*"

**Handoff Flow (lines 84-90):**
```typescript
const handleUseTemplate = () => {
  let code = template.vidscript;
  Object.entries(values).forEach(([key, value]) => {
    code = code.replace(
      new RegExp(`\\{\\{${key}(?:\\s*\\|\\s*[^}]+)?\\}\\}`, 'g'),
      value || ''
    );
  });
  router.push(`/editor?code=${encodeURIComponent(code)}`);
};
```

**Issue:** Uses query param, not localStorage. **Current editor expects localStorage** (see section 3).
**Fix Required:** Either update detail page to use localStorage OR update editor to accept query param.

### API Endpoints
- **`/api/templates`** directory exists but is **EMPTY** (no route files)
- Needs to be created for:
  - `GET /api/templates` - List all templates
  - `GET /api/templates/[id]` - Get template details
  - `POST /api/templates` - Create template (auth required)
  - `PUT /api/templates/[id]` - Update template (auth required)
  - `DELETE /api/templates/[id]` - Delete template (auth required)

---

## 6. Existing Tests

**Location:** `/Users/nidheeshdas/Sources/tm/created/e2e/`

### Templates Tests
**File:** `templates.spec.ts` (53 lines)

**Test Coverage:**
- ✅ Templates page displays gallery (3 templates visible)
- ✅ Template details shown (prices, descriptions)
- ✅ Navigate to template detail (`/templates/[id]`)
- ✅ "Create New" button navigates to `/editor`
- ✅ Wedding template detail page loads with title
- ✅ Placeholder inputs visible (video, audio, text)
- ✅ Back button navigates to `/templates`

**Tests That Will Need Updates:**
- Template detail page now uses localStorage, not query param (update handoff flow)
- New tests needed for:
  - Filling multiple placeholder types and using template
  - "My Templates" section in account page
  - Template CRUD operations
  - User authentication during template creation

### Editor Tests
**File:** `editor.spec.ts` (80 lines)

**Test Coverage:**
- ✅ Editor displays default code
- ✅ Code validation (shows errors)
- ✅ Project settings apply to script
- ✅ Canvas preset selection
- ✅ Assets panel accessible
- ✅ Invalid code detection
- ✅ Navigation back to home

**Tests That Will Need Updates:**
- Template import from localStorage flow
- Placeholder extraction in imported code
- Render polling and download
- Integration with "My Templates" for loading user's templates

### Account Tests
**File:** `account.spec.ts` (79 lines)

**Test Coverage:**
- ✅ Signed-out shell displays properly
- ✅ Signed-in account management flows
- ✅ API key addition (with provider selection)
- ✅ Connection card visibility
- ✅ Profile data display

**Tests That Will Need Updates:**
- New "My Templates" tab with:
  - List of user's templates
  - Edit/view/delete template actions
  - Template status (draft/published)
  - Duplicate/fork template actions
- Template stats display (created, published, downloads, revenue)

### Other Test Files
- `parser.spec.ts`: Vidscript parsing (will need placeholder extraction tests)
- `render-constructs.spec.ts`: Render logic
- `home.spec.ts`: Homepage
- All existing tests should continue passing during implementation

---

## Key Constraints & Implementation Notes

### 1. **Placeholder Extraction**
- Current regex: `/\{\{(\w+)(?:\s*\|\s*([^}]+))?\}\}/g`
- Supports format: `{{name}}` or `{{name | default}}`
- Extracts ONLY placeholder names, not defaults
- Used in: parser/index.ts, template detail form rendering

### 2. **Template/Editor Handoff Mismatch**
- **Current Template Detail:** Uses `router.push(/editor?code=...)`
- **Current Editor:** Expects `localStorage.getItem('vidscript_import')`
- **Must Choose One:**
  - Option A: Update template detail to use localStorage (recommended)
  - Option B: Update editor to parse query param (less secure, visible in URLs)

### 3. **Sample Data Problem**
- `SAMPLE_TEMPLATES` hardcoded in `/app/templates/page.tsx`
- `TEMPLATES` hardcoded in `/app/templates/[id]/page.tsx`
- **Plan:** Create DB seeding script, migrate to API-driven templates

### 4. **User Context in Editor**
- Current render API hardcodes `userId: 1` (line 38 of render/route.ts)
- Must update to use `session.user.id` from auth
- Impacts: Render records, template ownership, asset association

### 5. **Auth Session to String IDs**
- Prisma User.id is Int
- NextAuth converts to string in token
- Must parse with `parseInt(session.user.id)` in API routes
- Be consistent across all template CRUD endpoints

### 6. **Template Status Field**
- Already exists in schema with default "draft"
- Possible values: "draft", "published", "archived"
- Use for visibility control: Only creator sees drafts, published appear in library

### 7. **JSON Field Handling**
- Placeholders stored as JSON array of objects (name, type, label, default, options, etc.)
- DefaultValues stored as JSON object (key → value map of user's chosen values)
- Use `Prisma.JsonValue` type for safety

### 8. **Render Integration**
- Render model references templateId (optional)
- Can track template-based renders separately
- Use for analytics: "renders from this template"

### 9. **File Paths**
- All paths are absolute starting from `/Users/nidheeshdas/Sources/tm/created/`
- Use for imports: `@/app/...`, `@/lib/...`, `@/components/...` (@ alias in tsconfig)

### 10. **No Template Tests Yet**
- Parser has placeholder tests (check parser.spec.ts)
- Need E2E tests for full template lifecycle (create → use → render → check result)

---

## Summary: What Exists vs. What Needs Building

### ✅ Exists
- Prisma Template model with all fields
- Auth/session system with NextAuth
- Editor page with placeholder extraction
- Account page with auth patterns & API routes
- Templates library page with sample data (hardcoded)
- Template detail page with placeholder form
- Test infrastructure (Playwright E2E tests)
- Parser with placeholder regex extraction

### ❌ Needs Building
- `/api/templates` route handlers (GET list, GET by id, POST create, PUT update, DELETE delete)
- User's "My Templates" UI in account page
- Database seeding for sample templates
- Update template detail → editor handoff (localStorage vs query param)
- Update editor render API to use authenticated userId (not hardcoded 1)
- Template creation/editing UI in editor or separate page
- Template publishing/sharing workflow
- Template preview (render a template with sample data)
- Template deletion with confirmation
- Template forking/duplication
- Tests for template CRUD, rendering, and handoff flows

