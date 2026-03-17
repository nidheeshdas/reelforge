# Template User Guide

Use this guide to save templates, browse the public library, fill placeholders, and manage your own templates in ReelForge.

After completing this guide, you will know how to:

- save a script from the editor as a reusable template
- browse and filter the public library
- use a template and fill its placeholders
- manage your own templates from your account
- choose a starter category that matches the kind of video you are building

## Before you start

You need:

- access to a running ReelForge app
- a working script in the editor if you want to save a template
- an account if you want to save, publish, or manage templates

You can browse public templates without learning the editor internals first, but saving and managing templates assumes you are signed in.

## Save a template from the editor

Save a template when you want to reuse the same structure, timing, or scene pattern more than once.

### Step 1: Finish or validate your script

Before saving, make sure your VidScript is in a usable state.

The current save flow validates the script before it is stored. If the script cannot be parsed, fix the editor errors first and then try again.

### Step 2: Open the save form

From the editor, open the template save form in the sidebar.

### Step 3: Fill in the template details

Enter the metadata that helps other people, or your future self, understand what the template is for:

- **Title** — short, specific name
- **Description** — what the template creates or when to use it
- **Category** — broad content type, such as ads or testimonials
- **Tags** — extra keywords for organization
- **Status** — choose whether the template should stay private or become public later

### Step 4: Save the template

When you save:

- the current script is stored as the template body
- placeholders are extracted from the script
- the selected status is stored with the template

> Tip: If you are still refining the template, save it as `draft` or `private` first and publish it later from **My Templates**.

## Browse and filter the public template library

Use the public template library when you want a starting point instead of building from scratch.

### Open the library

Go to `/templates`.

### Filter by category

Use the category filter to narrow the library to a content type you care about.

The UI currently highlights starter categories such as:

- ads
- testimonials
- memes
- artistic

You may also see templates in categories such as celebration, business, travel, or fitness.

### Change the sort order

The current library supports:

- **Newest first**
- **Most downloaded**

Use **Newest first** when you want fresh templates. Use **Most downloaded** when you want the most commonly reused options first.

### Open a template

Select a template card to open its detail page and review its inputs before using it.

## Use a template and fill placeholders

Templates can ask you for values before they open in the editor. This is how one template can be reused for many variations.

### What placeholders look like

A template can contain placeholders such as:

```text
{{headline}}
{{cta | Shop now}}
```

That means the template expects a value for `headline`, and it provides a default value for `cta`.

### Step 1: Open the template detail page

On the template detail page, review the form fields generated from the template.

Depending on the template, you may see fields for:

- text
- multi-line text
- numbers
- dropdown selections
- video inputs
- audio inputs

### Step 2: Fill the placeholder fields

Enter the values you want to use in the generated script.

If the template includes defaults, the form may already be pre-filled.

### Step 3: Click **Use Template**

When you click **Use Template**, ReelForge:

1. replaces the placeholders with your values
2. sends the filled script to the editor
3. opens the editor so you can keep editing

### What to check after import

Once the editor opens:

- confirm the placeholder text was replaced correctly
- review timing, assets, and effects
- make any final edits before rendering or resaving

## Manage templates from your account

Use **My Templates** on the account page to manage the templates you have already saved.

### What you can do today

The current account experience lets you:

- see all of your saved templates
- view how many are public or private
- edit a template title
- edit a template category
- publish a template
- unpublish a template
- open a template in the editor
- open a template detail page for remixing

### Publish a template

Publish a template when you want it to appear in the public library.

Use this flow when:

- the script is stable
- the placeholder fields are clear
- the title and description are understandable to other users

### Unpublish a template

Unpublish a template when you want to remove it from the public library without losing the saved work.

The current implementation moves it back into your private workspace.

### Open in editor

Use **Open in editor** when you want to continue editing the saved VidScript directly.

This is the best option when you are updating the template itself.

### Open for remixing

Use the template detail page when you want to treat the template like a guided starting point and fill placeholders before editing.

This is the best option when the template is already structured and you mainly want to swap values.

## Starter categories and when to use them

The current UI surfaces a few starter categories to make the library easier to browse.

### Ads

Use for:

- promos
- product features
- short conversion-focused clips

### Testimonials

Use for:

- customer quotes
- social proof
- before-and-after story formats

### Memes

Use for:

- quick social content
- trend-driven formats
- punchy text-first clips

### Artistic

Use for:

- visual mood pieces
- stylized edits
- experimental or creator-led formats

### Other categories you may encounter

You may also see categories such as:

- celebration
- business
- travel
- fitness

Treat these as content labels rather than rigid product areas. The current system allows category names beyond the starter set.

## Notes for advanced users

If you create templates for a team or for repeated internal use, keep these points in mind:

- write clear placeholder names so forms stay understandable
- include sensible default values where possible
- use private templates while refining timing or asset assumptions
- publish only after checking the output in the editor

Because the current handoff back to the editor happens after placeholder replacement, it is a good idea to verify the imported script before rendering.

## Current limitations

The current user-visible flow does **not** clearly support:

- deleting a template
- duplicating a template from the account page
- private share links
- paid template checkout

If you need those capabilities, treat them as follow-up feature work rather than documented behavior.

## Troubleshooting

### The template will not save

Most often, the current script is not valid enough to pass parser validation.

What to do:

- fix the script errors in the editor
- try saving again

### The wrong values appear in the editor

The template may include defaults, or one of the placeholder fields may have been left unchanged.

What to do:

- reopen the template detail page
- review each placeholder field
- import the template again

### I cannot find my template in the public library

The template may still be in `draft` or `private` status.

What to do:

- open **My Templates**
- publish the template
- refresh the library view
