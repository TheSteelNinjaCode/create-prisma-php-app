<!-- BEGIN:prisma-php-agent-rules -->

# Prisma PHP AI Agent Rules

Before generating, editing, or reviewing Prisma PHP code, read the installed Prisma PHP docs for the current project version, read the project manifest, and only inspect framework internals when the docs do not answer the task.

Do not guess framework behavior from Laravel, Next.js, React, Vue, Livewire, Alpine, or generic PHP habits. The installed Prisma PHP docs and the local project configuration are the source of truth.

## Source of truth priority

Use this order of truth when working in a Prisma PHP project:

1. The user’s explicit request
2. `./prisma-php.json`
3. Installed Prisma PHP docs in `node_modules/prisma-php/dist/docs`
4. Project-local conventions and existing project files
5. Prisma PHP core internals in `vendor/tsnc/prisma-php/src`
6. General framework knowledge

If a documented Prisma PHP rule conflicts with a habit from another framework, follow Prisma PHP.

## Installed docs location

The installed Prisma PHP documentation for the active project lives in:

```txt
node_modules/prisma-php/dist/docs
```

AI agents must treat this directory as the primary documentation source for Prisma PHP behavior, routing, file conventions, features, helpers, and usage patterns for the installed version.

Before writing framework-specific code, inspect the relevant documentation files in this directory.

## Read `prisma-php.json` first

Before generating code or making framework decisions, read:

```txt
./prisma-php.json
```

Treat it as the capability manifest for the current app.

Use it to verify whether the project has features such as:

- `tailwindcss`
- `backendOnly`
- `swaggerDocs`
- `websocket`
- `mcp`
- `prisma`
- `typescript`

Also use it to confirm environment-specific project details such as:

- project root path
- PHP executable path
- BrowserSync target and path rewrite rules
- component scan directories
- excluded files

Do not assume a feature is enabled unless it is present and enabled in `prisma-php.json`.

## Framework-managed generated files

Prisma PHP automatically generates and maintains certain framework files.

### `files-list.json`

Do **not** create, edit, reorder, or manually maintain `files-list.json`.

Treat `files-list.json` as a **framework-generated file** for route discovery and internal bookkeeping. When creating, renaming, or removing routes, make the change in the actual route folders and route files under `src/app` and let Prisma PHP regenerate `files-list.json` automatically.

If a route task appears to require editing `files-list.json`, that is almost certainly the wrong approach. The correct workflow is:

1. create or update the route folder/file in `src/app`
2. do **not** touch `files-list.json`
3. let Prisma PHP regenerate framework-managed route metadata

## Required doc-routing map

Before generating code, choose the documentation file based on the task.

### Read these docs first for these tasks

- **Project setup, folder placement, route file choice, or overall file conventions**  
  Read `project-structure.md`

- **Creating a page, layout, nested route, dynamic route, or normal UI route**  
  Read `layouts-and-pages.md`

- **Creating, editing, composing, or reviewing PHPX components, props, children, fragments, icons, buttons, accordions, or component file placement**  
  Read `components.md`

- **File uploads, `multipart/form-data`, `$_FILES`, `PP\FileManager\UploadFile`, rename flows, delete flows, allowed file types, upload size rules, or file manager UI behavior**  
  Read `file-manager.md`, then verify the official File Manager docs at `get-started-file`

- **Authentication strategy, `AuthConfig.php`, route privacy model, sign-in, sign-out, JWT session lifecycle, `refreshUserSession`, RBAC, credentials auth, OAuth, social login, or auth state manager usage**  
  Read `authentication.md`, then verify the matching official docs in this order: `auth-get-started`, `credentials`, and `state-manager-auth`

- **Loading data, calling backend logic from the frontend, `pp.fetchFunction(...)`, `#[Exposed]`, or interactive backend validation**  
  Read `fetching-data.md`

- **Cache behavior, route caching, invalidation, or `CacheHandler`**  
  Read `caching.md`

- **Prisma ORM, `schema.prisma`, migrations, generated PHP classes, `npx ppo generate`, or database provider changes**  
  Read `prisma-php-orm.md`

- **Expected errors, uncaught exceptions, `error.php`, `not-found.php`, `ErrorHandler`, or validation failures as expected errors**  
  Read `error-handling.md`

- **Metadata, title, description, head scripts, favicon, icon, or `MainLayout` metadata behavior**  
  Read `metadata-and-og-images.md`

- **API-style routes, JSON responses, handlers, form-processing endpoints, `route.php`, or request validation in handlers**  
  Read `route-handlers.md`

- **PulsePoint runtime behavior such as `pp.state`, `pp.effect`, `pp.ref`, `pp-for`, `pp-spread`, or `pp-ref`**  
  Read `pulsepoint.md`

- **Sanitization, `PP\Validator`, `PP\Rule`, field validation, form validation, live validation, or backend validation rules**  
  Read the official Validator docs at `https://prismaphp.tsnc.tech/docs/php-validator`, then apply the relevant local guidance from `fetching-data.md`, `error-handling.md`, and `route-handlers.md`

- **Upgrading Prisma PHP, enabling features, syncing framework-managed project files, or running project updates**  
  Read `upgrading.md`

- **First-time project installation or app creation flow**  
  Read `installation.md`

- **General doc entry point and framework orientation**  
  Read `index.md`

## Default workflow for AI agents

Use this workflow unless the user asks for something narrower:

1. Read `./prisma-php.json`
2. Read the relevant installed doc from `node_modules/prisma-php/dist/docs`
3. Inspect nearby project files that match the route, feature, or component being changed
4. If the task is component-related, read `components.md` before generating PHPX component code
5. If the task is upload- or file-manager-related, read `file-manager.md` before generating upload, rename, delete, or file-listing code
6. Generate code using Prisma PHP conventions
7. Inspect `vendor/tsnc/prisma-php/src` only if framework internals are required

Do not jump directly into framework internals if the installed docs already answer the task.

## Route file decision rules

When the task is about creating or editing a route, do not guess.

Important: creating a route means creating or updating the correct folder and route file under `src/app`. It does **not** mean editing generated route metadata. In particular, never update `files-list.json` by hand.

- Use `index.php` for rendered UI and normal page routes
- Use `layout.php` for shared UI that wraps route subtrees
- Use `route.php` for direct handlers such as JSON endpoints, API-style routes, AJAX handlers, form-processing endpoints, webhooks, or other no-view server logic
- Use `not-found.php` for route-specific not-found UI
- Use `error.php` for route or app-level error UI

Also verify `backendOnly` in `prisma-php.json`:

- if `backendOnly` is `false`, normal routes should usually be implemented with `index.php`
- if `backendOnly` is `true`, route behavior will usually center on `route.php`

## Authentication rules

When the task involves auth, do not guess from Laravel, NextAuth, generic JWT packages, or ad hoc middleware habits.

Use this auth decision flow:

1. read `authentication.md`
2. verify the relevant official auth docs for the installed version
3. inspect `src/Lib/Auth/AuthConfig.php` when present
4. inspect the current auth-related routes under `src/app`
5. inspect Prisma models that support auth before generating registration, login, or provider code
6. keep route protection, function protection, and session lifecycle aligned with Prisma PHP’s documented auth model

Important auth rules:

- route privacy strategy is configured from `AuthConfig.php`
- Prisma PHP supports both public-default and private-default route protection strategies
- sign users in with `Auth::signIn(...)`
- sign users out with `Auth::signOut(...)`
- use `refreshUserSession(...)` when current-session auth payloads must be updated after role or profile changes
- use role-based route protection in auth config for page access control
- use `#[Exposed(allowedRoles: [...])]` for function-level access control when frontend code calls PHP directly
- for credentials auth, model the schema first, then generate ORM classes before writing auth flows
- for social auth, use the documented provider flow and dynamic callback route pattern instead of inventing custom OAuth glue

## File Manager rules

When the task involves file uploads, file browsing, file replacement, rename actions, delete actions, or upload validation, read `file-manager.md` first.

Use this file-manager decision flow:

1. read `file-manager.md`
2. verify the official File Manager docs for the installed version
3. decide whether the task belongs in a rendered page with `index.php` or a direct handler with `route.php`
4. confirm the upload destination directory is outside `src/app`
5. use `PP\FileManager\UploadFile` when the task matches the documented upload workflow
6. use `PP\Validator` for non-file request values such as rename targets, labels, or filters
7. return structured messages for expected upload failures such as invalid size, invalid type, partial upload, or missing file

Important file-manager rules:

- do **not** omit `enctype="multipart/form-data"` on upload forms
- do **not** forget the `[]` suffix when generating multiple-file inputs
- do **not** place uploaded files inside `src/app`
- do **not** assume HTML size hints replace `php.ini` upload limits
- do **not** invent undocumented storage abstractions when `UploadFile` already fits the task
- for upload, rename, replace, delete, and file-listing tasks, read `file-manager.md` first

## Prisma ORM workflow rules

When the task involves Prisma ORM, do not default to framework update commands.

Use this ORM decision flow:

1. confirm which database provider the project uses
2. inspect `prisma/schema.prisma`, Prisma config, and relevant environment values
3. inspect `.env` when the datasource uses `env("DATABASE_URL")`
4. if the provider is `sqlite`, confirm `DATABASE_URL` exists and resolves to a valid SQLite file path
5. if the provider is `sqlite` and the database file is missing, invalid, or not initialized yet, run `npx prisma migrate dev`
6. if the provider is `mysql` or `postgresql`, run `npx prisma migrate dev` on first setup and whenever `schema.prisma` changes
7. after schema synchronization, run `npx ppo generate`
8. only then write or update PHP code that depends on the generated Prisma classes

Important rules:

- do **not** use `npx pp update project -y` as the normal fix for Prisma ORM schema changes
- use `npx prisma migrate dev` for the normal development migration workflow
- use `npx prisma migrate deploy` for production or CI/CD migration application
- use `npx prisma db push` only for explicit prototyping or no-migration database sync
- do **not** treat `npx ppo generate` as a migration step
- `npx ppo generate` should run the first time generated PHP ORM classes are needed and whenever `schema.prisma` changes
- if the task mentions Prisma ORM, `schema.prisma`, migrations, generated classes, SQLite, MySQL, or PostgreSQL, read `prisma-php-orm.md` first

## Validation rules

When a task involves user input, form handling, search params, JSON payloads, `pp.fetchFunction(...)`, or `route.php` bodies, do not trust raw values.

Default Prisma PHP validation rules:

- use **`PP\Validator`** as the backend validation and normalization layer
- prefer the **`Rule` builder** for rule-based validation
- validate in PHP even when the frontend already performs local checks
- return structured validation results for expected failures
- do not treat routine invalid input as an uncaught exception
- in reactive flows, use PulsePoint for local state and `Validator` for authoritative server validation

## PulsePoint rules

When a task involves reactive frontend behavior, read `pulsepoint.md` first.

Also follow these rules:

- do not invent undocumented PulsePoint helpers or directives
- do not write React, Vue, Alpine, or Livewire syntax and call it PulsePoint
- keep backend concerns separate from PulsePoint runtime concerns
- prefer simple documented runtime primitives over abstractions copied from other ecosystems

## Reactive frontend + server-call rule

For frontend interactivity in Prisma PHP, prefer the documented Prisma PHP pattern:

- use **PulsePoint** for reactive browser state and UI behavior
- use **`pp.fetchFunction(...)`** for page-local or component-local server calls
- expose callable PHP functions with **`#[Exposed]`**

Do not default to handcrafted `fetch('/api/...')` calls, ad hoc AJAX endpoints, or extra `route.php` files when the task is a normal reactive UI interaction that fits `pp.fetchFunction(...)`.

Use `route.php` when the user explicitly needs an API-style endpoint, webhook, JSON route, or handler that should exist independently of the current page.

## Component rules

When the task involves Prisma PHPX components, reusable UI elements, props, children, fragments, icons, buttons, accordions, or component composition, read `components.md` first.

Also follow these rules:

- do not assume React, Vue, Blade, or generic templating component behavior maps directly to Prisma PHPX
- keep component file names and class names aligned
- preserve documented PHPX patterns for `$props`, `$children`, `$class`, and `getAttributes(...)`
- follow documented component placement and grouping conventions before inspecting framework internals
- use `vendor/tsnc/prisma-php/src` only when the installed docs and `components.md` do not answer the task

## Prisma PHP XML syntax rules

Prisma PHP uses XML-style syntax for PHPX and template markup.

AI agents must follow strict XML rules when generating tags and attributes.

### Closing tags

All tags must be properly closed.

Correct:

```xml
<hr />
<input type="text" />
<div></div>
```

Incorrect:

```xml
<hr>
<input type="text">
```

### Attributes

All attributes must use double quotes.

Correct:

```xml
<input id="email" />
<input required="true" />
```

Incorrect:

```xml
<input id=email />
<input required />
```

### Boolean attributes

Boolean attributes must be explicit.

Correct:

```xml
<input disabled="true" />
<option selected="true">Admin</option>
```

Incorrect:

```xml
<input disabled />
<option selected>Admin</option>
```

Do not output permissive HTML shorthand in Prisma PHP UI files.

## When to inspect framework internals

Prisma PHP core Composer package files live in:

```txt
vendor/tsnc/prisma-php/src
```

Inspect this directory only when the task depends on framework internals not already answered by the installed docs.

Use it when the task involves:

- confirming namespaces, classes, or helper names
- understanding how a core class behaves internally
- verifying available attributes such as `#[Exposed]`
- checking PHPX compiler or template compiler behavior
- tracing PulsePoint integration points inside Prisma PHP
- debugging framework-level issues that are not explained by the docs

For ordinary app work, prefer the installed docs and local project files first.

## Upgrade and feature-enable workflow

If the task involves enabling a feature, syncing framework-managed files, or updating the project structure, read `upgrading.md` first.

Important rules:

- update `prisma-php.json` before assuming a feature is active
- do not assume Tailwind, Prisma, Swagger, WebSocket, MCP, or TypeScript support is enabled unless `prisma-php.json` says so
- after changing feature flags, follow the documented project update flow
- for AI-driven or scripted updates, prefer:

```bash
npx pp update project -y
```

This command is for project updates and framework-managed file refreshes. It is not the default ORM migration command.

## Final operating rule

When Prisma PHP behavior is documented locally, read the relevant installed doc first and follow it.

Do not guess.

<!-- END:prisma-php-agent-rules -->
