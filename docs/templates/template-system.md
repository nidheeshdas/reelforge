# Template System

This document explains how the current template lifecycle works in ReelForge from a developer and advanced-user perspective.

Use this guide when you need to understand how templates are saved, published, loaded, and handed back to the editor.

## What the template system does

The template system lets you:

- save the current VidScript from the editor as a reusable template
- keep templates private while you refine them
- publish templates to the public library
- browse public templates by category or sort order
- open a saved template in the editor
- use placeholder-driven templates that ask for values before loading into the editor

## Lifecycle and visibility

Templates move through a small status model:

- `draft` — saved working copy
- `private` — saved template that is not listed publicly
- `public` — published template visible in the public library
- `archived` — defined in the status model, but not a primary end-user flow in the current UI

### Practical behavior

- The editor save form lets you choose the status when saving.
- Publishing from **My Templates** moves a template to `public`.
- Unpublishing from **My Templates** moves a template back to `private`.
- Public templates are visible in the library.
- Private and draft templates are available to their creator in **My Templates**, but not to other users.

## Save flow from the editor

The editor page provides a save flow for turning the current script into a template.

### What happens when you save

1. You open the save form from the editor.
2. You enter metadata:
   - title
   - description
   - category
   - tags
   - status
3. The app validates the current VidScript before saving.
4. The app extracts placeholders from the script.
5. The app sends the template to the templates API.

### Saved template fields

The current implementation stores template data such as:

- `title`
- `description`
- `category`
- `tags`
- `vidscript`
- `placeholders`
- `defaultValues`
- `status`
- `priceCents`
- `thumbnailUrl`

Not every field is equally prominent in the UI, but these fields exist in the current model and API payload shape.

## Placeholder model

Templates can include placeholders inside VidScript using the current placeholder syntax:

```text
{{name}}
{{name | defaultValue}}
```

### How placeholders are used

- The editor save flow extracts placeholders from the current script.
- The template detail page normalizes placeholder definitions into form fields.
- When a user clicks **Use Template**, the app replaces placeholders with the submitted values.
- The resulting VidScript is passed back into the editor.

### Current placeholder input types surfaced in the UI

The template detail form currently supports these field types:

- text
- textarea
- number
- select
- video
- audio

### Important implementation note

The handoff back to the editor currently uses `localStorage` to store the filled VidScript before navigation. The editor reads that value on load, imports it, and clears the stored value.

That means template usage is client-side at the point where placeholder values are applied.

## Public template library

The public template library lives at `/templates`.

### What users can do there

- browse public templates
- filter by category
- change sort order
- open a template detail page

### Current filters and sorting

The current UI exposes:

- **Category filter**
- **Sort order**
  - newest first
  - most downloaded

There is no separate free-text search or pagination flow documented in the current implementation.

### Categories

The library UI surfaces a canonical starter set of categories:

- `ads`
- `testimonials`
- `memes`
- `artistic`

The template UI also includes visual treatment for categories such as:

- `celebration`
- `business`
- `travel`
- `fitness`

Templates are not limited to a fixed enum at the database layer. Category is effectively a string field, so new category labels can be saved. The library still presents a curated set of starter categories in the main browse experience.

## Template detail and use flow

Each template has a detail page at `/templates/[id]`.

### What the detail page does

- loads the selected template
- shows template metadata
- builds a form from placeholder definitions
- pre-fills defaults where available
- lets the user generate a working script from the template

### Use Template flow

When the user clicks **Use Template**:

1. placeholder values are merged into the template VidScript
2. the resolved script is stored in local storage
3. the app navigates to `/editor`
4. the editor imports the resolved script

## Account-side template management

Authenticated users manage saved templates from the **My Templates** section of the account page.

### Current supported actions

- view saved templates
- see published/private counts
- edit title and category
- publish a template
- unpublish a template
- open a template in the editor
- open a template for remixing from its detail page

### What “Open in editor” means

Opening a template in the editor loads the saved VidScript directly into the editor as a starting point.

### What “Open for remixing” means

Opening a template for remixing takes the user to the template detail page so they can fill placeholders before loading the result into the editor.

## API surface

The current implementation uses these template endpoints:

- `GET /api/templates`
  - list public templates
  - list the current user's templates with `scope=mine`
- `POST /api/templates`
  - create a new template
- `GET /api/templates/[id]`
  - fetch a specific template
- `PUT /api/templates/[id]`
  - update template fields
- `POST /api/templates/[id]/publish`
  - publish a template
- `POST /api/templates/[id]/unpublish`
  - move a public template back to private

### Auth behavior

- Create, update, publish, and unpublish actions require an authenticated session.
- Public templates can be viewed through the public library.
- Non-public templates are restricted to their creator.

## Operational and setup notes

Advanced users and developers should know the following:

### Environment

The project expects standard application setup for:

- PostgreSQL through `DATABASE_URL`
- NextAuth through `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
- token encryption through `ENCRYPTION_KEY`

Optional integrations such as GitHub, Google Drive, and Dropbox also appear in the environment configuration.

### Database and schema

Templates are backed by Prisma models. If you are setting up the project locally, generate the Prisma client and apply the schema before testing template flows.

### Ownership and access

- creator ownership is enforced for private management actions
- public listing depends on template status
- the creator can still access their own non-public templates through account management

## Current limitations to document honestly

These behaviors should not be presented as supported user features yet:

- deleting templates
- duplicating or forking templates
- private sharing links
- full paid-template checkout flow
- version history for templates

Some schema support exists for adjacent capabilities, but the current end-user documentation should stay limited to the flows that are actually exposed.

## Recommended verification points

If you change template behavior, re-check:

- editor save form fields and validation
- placeholder extraction and default handling
- library filter and sort options
- My Templates actions and labels
- template detail form field types
- local-storage import behavior between template detail and editor
