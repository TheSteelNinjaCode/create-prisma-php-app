<!-- BEGIN:prisma-php-agent-rules -->

# Prisma PHP AI Agent Rules

This AGENTS.md belongs in the root of a Prisma PHP application.

Treat `./node_modules/prisma-php/dist/docs/index.md` as the entry point for Prisma PHP guidance, then read the matching document in `./node_modules/prisma-php/dist/docs` before generating, editing, reviewing, or documenting framework-specific behavior.

Treat the installed docs as framework knowledge. They explain what Prisma PHP can do and how to do it. Do not treat the presence of a page in `./node_modules/prisma-php/dist/docs` as proof that the current app has that feature enabled.

Do not guess framework behavior from Laravel, Next.js, React, Vue, Livewire, Alpine, Symfony, Socket.IO, or generic PHP habits. Prisma PHP's installed docs in `./node_modules/prisma-php/dist/docs` and the current project files are the source of truth.

If `.github/instructions/**/*.instructions.md` exists, treat those files as workspace-local task instructions. Inspect `.github/instructions/` before deciding how to implement the task, then read any instruction files whose name, described scope, target files, or library focus matches the current work, such as PHPXUI or `ppicons`.

## Documentation source of truth

For Prisma PHP projects, use this order first:

1. the user's explicit request
2. `./prisma-php.json`
3. the relevant `.github/instructions/**/*.instructions.md` files for the current task, library, or target files
4. the relevant installed document in `./node_modules/prisma-php/dist/docs`
5. `./AGENTS.md`
6. project-local conventions and existing app files
7. Prisma PHP core internals in `vendor/tsnc/prisma-php/src` only when the docs still leave a gap
8. general framework knowledge as the last fallback

Important rules:

- use `./prisma-php.json` as the single source of truth for current-project feature flags and framework-managed scaffolds
- if `.github/instructions/**/*.instructions.md` exists, inspect `.github/instructions/` and read the files that match the current task, named library, or target files before generating code
- treat `.github/instructions/**/*.instructions.md` as workspace-local guidance for third-party libraries, design systems, icon packs, and other implementation-specific rules
- treat `./node_modules/prisma-php/dist/docs` as the single documentation source of truth for the installed Prisma PHP version
- treat the docs inventory as a framework reference set for AI routing, not as a statement that every optional Prisma PHP feature is enabled in the current app
- expect `./AGENTS.md` at the project root
- when the installed docs and a habit from another framework conflict, follow Prisma PHP
- when a workspace instruction file and the general Prisma PHP docs both apply, follow both; keep `./prisma-php.json` as the source of truth for feature enablement and prefer the most specific matching instruction for library- or file-scoped implementation details
- in consumer apps, use `./node_modules/prisma-php/dist/docs` as the installed docs location; do not assume a root-level `./dist/docs` directory exists
- when updating Prisma PHP package/docs sources in the Prisma PHP package source repo, keep the source-repo `AGENTS.md` and source-repo `dist/docs` aligned; if that repo also maintains `.github/copilot-instructions.md` or `.github/instructions/**/*.instructions.md`, keep those source-repo files aligned there too

## Runtime lookup for AI

Use this map only after `prisma-php.json`, matching workspace instructions, installed docs, and current project files do not answer the task.

| Need to verify | Runtime/source file |
| --- | --- |
| route root scoping, HTML fragment parsing, component tag compilation, prop casing | `vendor/tsnc/prisma-php/src/PHPX/TemplateCompiler.php` |
| PHPX class composition, `getMergeClasses(...)`, and frontend `twMerge(...)` expression generation | `vendor/tsnc/prisma-php/src/PHPX/PHPX.php`, `vendor/tsnc/prisma-php/src/PHPX/TwMerge.php` |
| imported PHP partial execution, one-root enforcement, prop serialization, imported `#[Exposed]` functions | `vendor/tsnc/prisma-php/src/ImportComponent.php` |
| metadata, custom head tags, dynamic head/footer scripts | `vendor/tsnc/prisma-php/src/MainLayout.php` |
| route and component maps | `vendor/tsnc/prisma-php/src/PrismaPHPSettings.php`, `settings/files-list.json`, `settings/component-map.json` |
| request data, dynamic params, redirects, RPC/navigation wire detection (`$isRpc`, `$isNavigation`, `$isWire`) | `vendor/tsnc/prisma-php/src/Request.php` |
| CSRF cookie family (`pp_csrf`, `pp_csrf_<port>`), token issuing and validation | `vendor/tsnc/prisma-php/src/Security/Csrf.php` |
| exposed functions | `vendor/tsnc/prisma-php/src/Attributes/Exposed.php`, `vendor/tsnc/prisma-php/src/Attributes/ExposedRegistry.php` |
| validation | `vendor/tsnc/prisma-php/src/Validator.php`, `vendor/tsnc/prisma-php/src/Rule.php` |
| env values | `vendor/tsnc/prisma-php/src/Env.php` |
| uploads, email, streaming | `vendor/tsnc/prisma-php/src/FileManager/UploadFile.php`, `vendor/tsnc/prisma-php/src/PHPMailer/Mailer.php`, `vendor/tsnc/prisma-php/src/Streaming/SSE.php` |

## Installed docs location

In Prisma PHP applications, the installed docs live in:

```txt
node_modules/prisma-php/dist/docs
```

The current docs entry point for the installed version is:

```txt
node_modules/prisma-php/dist/docs/index.md
```

The project root should also include:

```txt
AGENTS.md
```

When present, task-scoped workspace instructions live in:

```txt
.github/instructions
```

## Required doc-routing map

Before generating code, examples, instructions, or reviews, choose the documentation file based on the task.

Use the docs router to learn how Prisma PHP implements a task. Use `./prisma-php.json` to decide whether the current app enables the relevant optional feature. When `.github/instructions/` exists, inspect that directory first and read any `*.instructions.md` files that match the task before routing into the Prisma PHP docs.

### Read workspace instruction files first for these tasks

- **Third-party UI, icon, component, or design-system work such as PHPXUI, `ppicons`, or similar workspace-specific integrations**  
  Read the matching `.github/instructions/**/*.instructions.md` file first

- **Tasks that target files, folders, or conventions covered by a workspace instruction file**  
  Read the most specific matching `.github/instructions/**/*.instructions.md` file first

- **Library-specific refactors, reviews, or implementations where the workspace provides a dedicated instruction file**  
  Read that instruction file first, then read the matching Prisma PHP docs page for framework behavior

### Read these docs first for these tasks

- **Framework orientation, repo-wide guidance, or the high-level AI quick start**  
  Read `index.md`

- **Project setup, folder placement, route file choice, feature placement, or overall file conventions**  
  Read `project-structure.md`

- **CLI project creation, starter kits, feature flags, or `npx pp update project` usage**  
  Read `commands.md`

- **Backend-only Prisma PHP usage, API-first projects, `backendOnly`, separate frontend consumers, or CORS setup for API routes**  
  Read `backend-only.md`

- **Creating a page, layout, nested route, dynamic route, or normal UI route**  
  Read `layouts-and-pages.md`

- **Creating, editing, composing, or reviewing PHPX components, props, children, fragments, icons, buttons, accordions, or component file placement**  
  Read `components.md`

- **Tailwind utility class composition, `getMergeClasses(...)`, `PP\PHPX\TwMerge`, or frontend `twMerge(...)` usage**  
  Confirm `tailwindcss` in `prisma-php.json`, then read `components.md` for PHPX emission, `typescript.md` for app-level helper registration, and `layouts-and-pages.md` for route examples

- **TypeScript frontend tooling, the `typescript` feature flag, the root `ts/` directory, `ts/main.ts`, npm packages, or registered browser helpers used from template expressions and PulsePoint scripts**  
  Read `typescript.md`, then use `pulsepoint.md`, `layouts-and-pages.md`, or `components.md` for the affected component boundary

- **Loading data, calling backend logic from the frontend, `pp.rpc(...)`, `#[Exposed]`, route-local mutations, streaming responses, or interactive backend validation**  
  Read `fetching-data.md`

- **AI integration, provider SDKs, chat UIs, streamed assistant output, or deciding between page-local assistant UI, websocket, and MCP tools**  
  Read `get-started-ia.md`, then use `fetching-data.md`, `validator.md`, `websocket.md`, or `mcp.md` as needed

- **PulsePoint runtime behavior such as `pp.state`, `pp.effect`, `pp-for`, `pp-spread`, `pp-style`, `pp-ref`, context, portals, controlled form values, or keyed diffing**
  Read `pulsepoint.md`

- **Validation, sanitization, `PP\Validator`, `PP\Rule`, field validation, form validation, live validation, or request validation rules**  
  Read `validator.md`, then apply the relevant local guidance from `fetching-data.md`, `error-handling.md`, and `route-handlers.md`

- **Environment variables, `.env`, `PP\Env`, `Env::get`, `Env::string`, `Env::bool`, `Env::int`, feature flags, host and port config, or runtime bootstrap settings**  
  Read `env.md`, then verify the official env docs at `env` and `env-file`

- **Bootstrap flow, request initialization, `FUNCTION_CALL_SECRET`, `pp_csrf`, route resolution, or runtime init order**  
  Read `bootstrap-runtime.md`, then use `env.md`, `fetching-data.md`, or `error-handling.md` as needed

- **File uploads, `multipart/form-data`, `$_FILES`, `PP\FileManager\UploadFile`, rename flows, replace flows, delete flows, allowed file types, upload size rules, or file manager UI behavior**  
  Read `file-manager.md`, then verify the official File Manager docs and, when internals matter, the core upload file at `vendor/tsnc/prisma-php/src/FileManager/UploadFile.php`

- **SMTP setup, `.env` mail variables, `PP\PHPMailer\Mailer`, HTML bodies, plain-text bodies, recipients, reply-to, CC, BCC, or attachments**  
  Read `email.md`, then verify the official email docs at `email-get-started`

- **Named sockets, `pp.socket(...)`, `SocketRegistry`, `Socket`, `SocketPool`, the Ratchet socket server, or realtime route behavior**  
  Read `websocket.md`, then verify the official websocket docs in this order: `websocket-get-started`, `websocket-chat-app`

- **MCP support, `#[McpTool]`, `#[Schema]`, `PhpMcp\Server\Server`, `StreamableHttpServerTransport`, AI tool endpoints, or `src/Lib/MCP/mcp-server.php`**  
  Read `mcp.md`, then verify the official MCP docs in this order: `prisma-php-ai-mcp`, `ai-tools`

- **Authentication strategy, `AuthConfig.php`, route privacy model, sign-in, sign-out, JWT session lifecycle, `refreshUserSession`, RBAC, credentials auth, OAuth, social login, or auth state manager usage**  
  Read `authentication.md`, then verify the matching official docs in this order: `auth-get-started`, `credentials`, `state-manager-auth`

- **Cache behavior, route caching, invalidation, or `CacheHandler`**  
  Read `caching.md`

- **Prisma ORM, `schema.prisma`, migrations, generated PHP classes, `npx ppo generate`, or database provider changes**  
  Read `prisma-php-orm.md`

- **Expected errors, uncaught exceptions, `error.php`, `not-found.php`, `ErrorHandler`, or validation failures as expected errors**  
  Read `error-handling.md`

- **Metadata, title, description, custom head tags, favicon, icon, apple icon, or `MainLayout` metadata behavior**  
  Read `metadata-and-og-images.md`

- **API-style routes, JSON responses, handlers, webhooks, form-processing endpoints, `route.php`, or request validation in handlers**  
  Read `route-handlers.md`

- **Swagger or OpenAPI generation, `swaggerDocs`, generated per-model swagger docs, `create-swagger-docs`, or `settings/prisma-schema-config.json`**  
  Read `swagger-docs.md`

- **Writing or running app tests, PHPUnit, the root `tests/` directory, `npm run test`, or verifying a change with the test suite**  
  Read `testing.md`, then the project's `tests/README.md`

- **Upgrading Prisma PHP, enabling features, syncing framework-managed project files, or running project updates**  
  Read `upgrading.md`

- **First-time project installation or app creation flow**  
  Read `installation.md`

## Framework docs inventory in this repo

The current Prisma PHP docs shipped here include:

- `authentication.md`
- `backend-only.md`
- `bootstrap-runtime.md`
- `caching.md`
- `commands.md`
- `components.md`
- `email.md`
- `env.md`
- `error-handling.md`
- `fetching-data.md`
- `file-manager.md`
- `get-started-ia.md`
- `index.md`
- `installation.md`
- `layouts-and-pages.md`
- `mcp.md`
- `metadata-and-og-images.md`
- `prisma-php-orm.md`
- `project-structure.md`
- `pulsepoint.md`
- `route-handlers.md`
- `swagger-docs.md`
- `testing.md`
- `typescript.md`
- `upgrading.md`
- `validator.md`
- `websocket.md`

This inventory exists to help AI find the right Prisma PHP guidance quickly. It is not a feature inventory for the current app.

When a task depends on optional capabilities such as `backendOnly`, `swaggerDocs`, `typescript`, `websocket`, or `mcp`, inspect `./prisma-php.json` before assuming the generated scaffold exists.

When adding or reviewing AI guidance, do not stop at older docs only. Make sure the guidance also covers `backend-only.md`, `email.md`, `env.md`, `get-started-ia.md`, `mcp.md`, `swagger-docs.md`, `typescript.md`, and `websocket.md`, plus newer behavior documented in `fetching-data.md`, `metadata-and-og-images.md`, and `testing.md`.

## Framework-generated files

Prisma PHP automatically generates and maintains certain framework files in consumer apps.

### `files-list.json`

Do **not** create, edit, reorder, or manually maintain `files-list.json`.

Treat `files-list.json` as a framework-generated file for route discovery and internal bookkeeping. When creating, renaming, or removing routes in a Prisma PHP app, make the change in the actual route folders and route files under `src/app` and let Prisma PHP regenerate `files-list.json` automatically.

If a route task appears to require editing `files-list.json`, that is almost certainly the wrong approach.

## Reusable project organization

When organizing a growing Prisma PHP app, keep route code and reusable code separated.

- keep `src/app` focused on the route tree, route-local layouts, pages, handlers, and route-scoped partials
- prefer `src/Components` for reusable application UI components shared across multiple routes or layouts
- keep reusable non-UI code such as services, auth, middleware, Prisma classes, and helper libraries in `src/Lib`
- treat route-private folders such as `src/app/<route>/_components` as an implementation detail for files that stay owned by that route only
- treat generated libraries such as `src/Lib/PHPXUI` and `src/Lib/PPIcons` as library-specific surfaces governed by their manifests and matching `.github/instructions/**/*.instructions.md` files
- if a partial starts in `src/app` but becomes shared across the app, promote it into `src/Components`
- do **not** default to creating `src/app/<route>/_components` for app-owned section components such as `HeroSection`, `FormSection`, or `SidebarSection`; prefer `src/Components` unless the user explicitly wants route-local colocation and the files are truly private to that route
- do **not** default to placing app-wide reusable components under `src/app` unless the user explicitly wants route-local colocation

## HTML-first component tag contract

Class-based PHPX components and generated icon components are consumed with HTML-first `x-` tags from `settings/component-map.json`, such as `<x-alert>` and `<x-search />`.

Important rules:

- use the `tagName` entries in `settings/component-map.json` as the supported runtime contract
- inspect `settings/component-map.json` instead of inventing `x-` tag names from PHP class names
- document, review, and generate component and icon markup with the current `x-` tag shape
- keep examples aligned with the current runtime instead of carrying alternate tag-shape guidance

## Component attribute and prop contract

Component attributes in Prisma PHP template markup should be authored in kebab-case. The runtime maps kebab-case attribute names to camelCase prop and public property names when hydrating PHPX components and PulsePoint component boundaries.

Examples:

```html
<x-button as-child="true" />
<x-dialog-content close-on-escape-key="true" />
<x-calendar selected-date="{selectedDate}" on-date-select="{setSelectedDate}" />
```

Important rules:

- use kebab-case for component attribute names in documentation, examples, reviews, and generated code
- expect `as-child` to hydrate `asChild`, `close-on-escape-key` to hydrate `closeOnEscapeKey`, and `selected-date` to hydrate `selectedDate`
- use mustache values such as `selected-date="{selectedDate}"` and `on-date-select="{setSelectedDate}"` when a component prop must receive PulsePoint state or callbacks
- write component examples as HTML-first Prisma PHP markup using the current `x-` tag contract
- do not document component props with camelCase template attributes when writing new Prisma PHP markup

## Framework-managed package scripts

Prisma PHP can generate `package.json` scripts for BrowserSync, Tailwind, TypeScript, WebSocket, MCP, Swagger docs, and related project helpers.

AI agents should follow this default rule:

- prefer `npm run dev` for ordinary local development
- prefer `npm run build` for ordinary production-style asset builds
- do **not** default to telling users to run `npm run tailwind`, `npm run tailwind:build`, `npm run ts:watch`, or `npm run ts:build` after routine file changes, because those are usually framework-managed through the generated top-level scripts
- use `npm run websocket` or `npm run mcp` only when isolating local runtime startup, debugging, or when the project's scripts show those services are not already covered by the normal development flow
- use `npm run create-swagger-docs` only when Swagger or OpenAPI output must be intentionally generated or refreshed

When a task involves package scripts, read `commands.md` first and inspect the current `package.json` before assuming which feature scripts exist.

## BrowserSync URL source of truth

When AI needs to test or confirm whether a page route, exposed function request, proxy-backed response, or local server workflow is working, check `./settings/bs-config.json` first.

Important rules:

- use `./settings/bs-config.json` as the source of truth for the active BrowserSync URLs in this app
- do **not** assume the proxy remains on the default `http://localhost:5090`; if that port is already in use, Prisma PHP may use a different port
- confirm the current `local`, `external`, `ui`, and `uiExternal` values in `./settings/bs-config.json` before suggesting a browser URL, route test URL, or BrowserSync UI URL
- when frontend console logs, network errors, or terminal output suggest the app is being tested through the wrong URL or proxy port, re-check `./settings/bs-config.json` before changing app code

## Frontend browser log

During `npm run dev`, browser-side errors (every `console.error` / `console.warn` from page code -- PulsePoint `[PP-ERROR]` / `[PP-WARN]` diagnostics included -- plus uncaught errors and unhandled promise rejections; `console.log` stays in the browser) are forwarded to the dev terminal and appended to `.pp/browser-log.jsonl` by `settings/dev-log-bridge.ts`. This is the feedback signal for frontend health: after editing a route or component, check it instead of assuming the page mounted cleanly.

Important rules:

- run `npm run logs` (or `npm run logs -- --json` for machine-readable output) to get current per-route frontend status; it renders `.pp/browser-log.jsonl` via `settings/browser-log.ts`
- prefer `npm run logs` over reading `.pp/browser-log.jsonl` directly; the raw file is history, not current state -- an error is superseded by a later `load` or `resolved` event for the same route
- treat the session line first: `LIVE` means the dev server is running and the statuses are current; `stale`, `ended`, or `missing` mean the entries are history from an exited session, not the current state of the app
- a route reported `CLEAN` means its most recent page load produced no errors; mount-phase errors are genuinely re-tested by a reload
- a route reported `NEEDS RECHECK` holds interaction-phase errors (from clicks/submits) or errors carried across a source change; a reload does not re-test those, so repeat the interaction in a browser before treating them as fixed
- a route reported `UNCONFIRMED` was reported by a tab loaded before the current log started; reload that route to confirm whether the error is still live
- an empty log or an unlisted route means nobody opened that page this session -- that is no signal, not a pass; open the route in a browser (through the BrowserSync URL from `./settings/bs-config.json`) to generate one
- the log is per dev session: `.pp/` is deleted at the start of every `npm run dev`, and every source change compacts the log so stale errors do not read as current
- the bridge is development-only; it is injected by the BrowserSync proxy in `settings/bs-config.ts` and nothing about it ships to production builds

## CLI command alignment

When a task involves Prisma PHP CLI usage, keep the command guidance aligned with `commands.md`.

- for new apps, prefer `npx create-prisma-php-app <project-name>` as the default recommended create command
- for existing apps, prefer `npx pp update project` after saving feature changes in `prisma-php.json`
- when an existing app needs a specific release channel or pinned update version, prefer `npx pp update project --tag <value>` or `npx pp update project --tag=<value>`
- use `--tag <value>` or `--tag=<value>` for release-channel or pinned-version updates
- do **not** use `npx pp update project` as a substitute for Prisma ORM migration commands

## Default interactive UI and data-flow rule

For normal full-stack Prisma PHP work, assume the user wants the PulsePoint-first approach unless they explicitly ask otherwise.

PulsePoint is the primary JavaScript authoring model for frontend work in Prisma PHP. For normal page behavior, keep the client logic inside a plain inline `<script>` within the route or imported-partial root, let Prisma PHP scope and execute it, and prefer `pp.rpc(...)` over ad hoc endpoints.

Default interaction stack:

1. render route UI with `index.php`
2. keep browser-side interactivity in PulsePoint
3. call backend PHP from the frontend with `pp.rpc(...)`
4. mark callable PHP functions or methods with `#[Exposed]`
5. validate and normalize input on the PHP side with `PP\Validator`
6. use `pp.socket(...)` (named sockets) only when the flow is genuinely long-lived and bidirectional — chat, presence, live feeds

`pp.rpc(...)` is the runtime RPC API. Framework-level RPC failures (unknown function, auth, roles, CSRF, origin, rate limit, server error) arrive as HTTP error statuses with an `{"error": "..."}` body and **reject** the `pp.rpc(...)` promise, so wrap calls in `try/catch` when the UI reacts to failures. Routine, expected validation feedback should still be returned as structured data (`success`, `errors`, normalized values), not thrown.

Treat this as the default for:

- search
- filters
- pagination
- quick edit flows
- toggles
- dialogs and drawers
- inline validation
- route-local CRUD actions
- dashboard interactions
- streaming assistants
- progress logs
- similar reactive page behavior

Do **not** default to:

- a PHP-only interaction style
- plain browser-DOM wiring when PulsePoint state, bindings, and native `on*` handlers already fit the task
- ad hoc `fetch('/api/...')` patterns
- extra `route.php` files for page-local interactions that already fit `pp.rpc(...)`
- a separate Node realtime or tool server when the documented Prisma PHP runtime already fits the task

Choose a more PHP-only or handler-only pattern only when:

- the user explicitly asks for it
- the task is clearly non-reactive
- the task is a standalone API, webhook, integration endpoint, or public JSON handler

## Route structure rule AI must not get wrong

There are two related structure rules, and AI must not mix their responsibilities.

### Normal route files such as `index.php` and nested `layout.php`

Use this pattern:

1. PHP first
2. one parent HTML element as the route boundary
3. place the visible page or layout content inside that boundary
4. when PulsePoint is present, let Prisma PHP inject the route or layout `pp-component` scope on that root automatically
5. keep one `<script>` block as the last child of that boundary root

Also follow these route-file rules:

- `index.php` and nested `layout.php` must render a single parent HTML element
- use that single parent element as the route boundary; if the visible content should stay inside a semantic element such as `<main>`, `<section>`, or `<article>`, wrap it in a neutral parent such as `<div>`
- for normal pages and nested layouts, do **not** manually author `pp-component` on that root; Prisma PHP adds it automatically
- author a plain `<script>` tag inside that root when PulsePoint logic is needed and do **not** put any `type` attribute on it — the runtime only recognizes untyped component scripts
- keep the `<script>` as the last child of the route boundary, usually as a sibling of the visible content container instead of nesting it inside the semantic content element by default
- do **not** leave the `<script>` outside the route boundary
- write PulsePoint state, derived values, and functions directly at the top level of that script; do **not** wrap them in `DOMContentLoaded`, an IIFE, manual `pp.mount()` calls, or custom scoping helpers
- only the root `layout.php` should define `<html>`, `<head>`, and `<body>`
- when PulsePoint is present in a root `layout.php`, keep `MainLayout::$children` and any `<script>` inside one clear wrapper

Example:

```php
<?php

use PP\MainLayout;

MainLayout::$title = 'Todos';
MainLayout::$description = 'Track tasks and view the current item count.';
?>

<div>
    <section>
        <h1>Todos</h1>
        <p>Count: {count}</p>
    </section>

    <script>
        const [count, setCount] = pp.state(0);
    </script>
</div>
```

### Imported partials rendered with `ImportComponent::render(...)`

Use this pattern:

1. PHP first
2. exactly one parent root element
3. keep any component-local `<script>` inside that root element

Example:

```php
<?php

// PHP code

?>

<div>
    <h2>Search</h2>
    <input value="{query}" />
    <script>
        console.log('Search component ready');
    </script>
</div>
```

Do not:

- put a sibling `<script>` next to a route root or imported partial root
- manually add `pp-component` inside imported partial source
- add any `type` attribute to route or imported-partial component scripts
- wrap imported-partial PulsePoint code in `DOMContentLoaded`, an IIFE, manual `pp.mount()` calls, or custom auto-execute helpers

## Metadata rules

For document metadata, prefer `MainLayout::$title` and `MainLayout::$description`.

Important metadata rules:

- a local `$title` variable only affects rendered page content unless you also assign metadata through `MainLayout`
- use `MainLayout::addCustomMetadata(...)` for additional `<meta>` values when needed
- keep visible headings separate from document metadata when the UI text and SEO title must differ
- read `metadata-and-og-images.md` or `layouts-and-pages.md` before inventing Next.js-style metadata exports or Open Graph image workflows

## Streaming and SSE rules

Prisma PHP supports streaming through `pp.rpc(...)` when an exposed function yields values.

Default streaming rules:

- prefer an exposed generator that simply yields strings or arrays
- let Prisma PHP handle the SSE response automatically for normal `pp.rpc(...)` streaming
- on the client, put stream UI updates in `onStream`, `onStreamError`, and `onStreamComplete`
- do not wait for a final JSON payload when the response is streamed

Current parsing rules AI should know:

- Prisma PHP sends streamed payloads as SSE `data:` lines
- the built-in `pp.rpc(...)` stream parser currently forwards only `data:` lines to `onStream`
- `event:`, `id:`, and `retry:` may be emitted by low-level SSE helpers, but the built-in stream callback currently ignores them
- prefer JSON values or single-line strings for streamed chunks instead of multi-line text blobs

Low-level helpers exist when manual SSE control is required:

- `PP\Streaming\SSE`
- `PP\Streaming\ServerSentEvent`

Core locations documented for those helpers are:

```txt
vendor/tsnc/prisma-php/src/Streaming/SSE.php
vendor/tsnc/prisma-php/src/Streaming/ServerSentEvent.php
```

## Route file decision rules

When the task is about creating or editing a route, do not guess.

Important: creating a route means creating or updating the correct folder and route file under `src/app`. It does **not** mean editing generated route metadata.

- use `index.php` for rendered UI and normal page routes
- use `layout.php` for shared UI that wraps route subtrees
- use `route.php` for direct handlers such as JSON endpoints, API-style routes, AJAX handlers, form-processing endpoints, and webhooks
- use `not-found.php` for route-specific not-found UI
- use `error.php` for route or app-level error UI
- use `loading.php` when the task is specifically about a loading UI state for a route subtree

For normal route-local interactivity, prefer `index.php` plus PulsePoint and `pp.rpc(...)` over inventing extra handlers.

In a consumer app, also verify `backendOnly` in `prisma-php.json`:

- if `backendOnly` is `false`, normal routes should usually be implemented with `index.php`
- if `backendOnly` is `true`, route behavior will usually center on `route.php`

## Default workflow for AI agents

Use this workflow unless the user asks for something narrower.

1. read `./prisma-php.json`
2. inspect `.github/instructions/` and read any relevant `*.instructions.md` files when that directory exists
3. read the relevant installed doc from `./node_modules/prisma-php/dist/docs`
4. inspect `./AGENTS.md` for project-level Prisma PHP guidance
5. inspect nearby project files that match the route, feature, or component being changed
6. inspect `vendor/tsnc/prisma-php/src` only if the docs and matching workspace instructions do not answer the task

Do not jump directly into framework internals if the current docs and matching workspace instruction files already answer the task.

## Authentication rules

When the task involves auth, do not guess from Laravel, generic JWT packages, or ad hoc middleware habits.

Use this auth decision flow:

1. read `authentication.md`
2. verify the relevant official auth docs for the installed version
3. inspect `src/Lib/Auth/AuthConfig.php` when present
4. inspect the current auth-related routes under `src/app`
5. inspect Prisma models that support auth before generating registration, login, or provider code
6. keep route protection, function protection, and session lifecycle aligned with Prisma PHP's documented auth model

Important auth rules:

- the auth classes are app-owned files under `src/Lib/Auth` in the `Lib\Auth` namespace — write `use Lib\Auth\Auth;` and `use Lib\Auth\AuthConfig;`, never `PP\Auth\...`
- route privacy strategy is configured from `AuthConfig.php`
- Prisma PHP supports both public-default and private-default route protection strategies
- Prisma PHP defaults to public routes, so keep the public-default strategy when the app will expose many public pages
- choose the route privacy strategy early, ideally before creating most routes in a new app or route subtree
- if the app will have only a few public entry points and most routes should require login, switch to the private-default strategy
- when choosing private-default routing, enable both `AuthConfig::IS_ALL_ROUTES_PRIVATE` and `AuthConfig::IS_TOKEN_AUTO_REFRESH`
- when `IS_ALL_ROUTES_PRIVATE` is `true`, keep public exceptions in `AuthConfig::$publicRoutes`; home remains public by default because it starts as `['/']`
- keep `AuthConfig::$authRoutes` public by default unless the user explicitly wants a different auth route allowlist
- there is no need to modify other Prisma PHP core files to enable private-default routing
- if `src/Lib/Auth/AuthConfig.php` was customized, protect it from future project updates by adding `./src/Lib/Auth/AuthConfig.php` to `excludeFiles` in `prisma-php.json`
- sign users in with `Auth::getInstance()->signIn(...)`
- sign users out with `Auth::getInstance()->signOut(...)`
- use `Auth::getInstance()->refreshUserSession(...)` when current-session auth payloads must be updated after role or profile changes
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
4. use `./public/uploads` as the default local public upload directory and treat it as publicly accessible
5. use `PP\FileManager\UploadFile` when the task matches the documented upload workflow
6. use `PP\Validator` for non-file request values such as rename targets, labels, or filters
7. return structured messages for expected upload failures such as invalid size, invalid type, partial upload, or missing file

Important file-manager rules:

- do **not** omit `enctype="multipart/form-data"` on upload forms
- do **not** forget the `[]` suffix when generating multiple-file inputs
- do **not** place uploaded files inside `src/app`
- use `PUBLIC_PATH . '/uploads/'` or the equivalent absolute `./public/uploads` path for local public uploads
- treat files saved in `./public/uploads` as publicly accessible from the app's public web root
- keep `./settings/bs-config.ts` aligned with `const PUBLIC_IGNORE_DIRS = ["uploads"];` so local upload mutations do not trigger BrowserSync reloads
- do **not** document or generate legacy local upload destinations such as `DOCUMENT_PATH . '/uploads/'`, a project-root `/uploads`, or `src/uploads`
- do **not** assume HTML size hints replace `php.ini` upload limits
- do **not** invent undocumented storage abstractions when `UploadFile` already fits the task

## Email rules

When the task involves email, read `email.md` first.

Prisma PHP email follows the documented `PP\PHPMailer\Mailer` model backed by PHPMailer. Do not replace it with raw `mail()`, undocumented wrappers, or habits copied from another mail framework.

Use this email workflow:

1. read `email.md`
2. inspect `.env` for SMTP and sender values in the target app
3. inspect the route, exposed function, or handler that sends the email
4. inspect the HTML body or attachment source when present
5. inspect framework internals only when the docs and current app code still leave a gap

The documented core mailer file is:

```txt
vendor/tsnc/prisma-php/src/PHPMailer/Mailer.php
```

Important email rules:

- keep SMTP credentials and sender defaults in `.env`, not in route files
- the documented env vars are `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_ENCRYPTION`, `SMTP_PORT`, `MAIL_FROM`, and `MAIL_FROM_NAME`
- validate user-provided email fields before calling the mailer
- prefer the documented fluent API such as `to(...)`, `subject(...)`, `html(...)`, `text(...)`, `attach(...)`, and `send()`
- use `raw()` only when low-level PHPMailer access is genuinely needed

## Env rules

When the task involves `.env`, `PP\Env`, feature flags, ports, host names, timezones, API keys, numeric limits, or other runtime configuration values, read `env.md` first.

Use this env workflow:

1. read `env.md`
2. inspect `.env` or the deployment environment when the task depends on actual values
3. inspect the bootstrap or server entry file that loads or consumes the environment
4. inspect the feature-specific doc such as `email.md`, `mcp.md`, `websocket.md`, `get-started-ia.md`, or `prisma-php-orm.md` when the env values belong to that feature
5. inspect `vendor/tsnc/prisma-php/src/Env.php` only if the docs do not answer the task

Important env rules:

- prefer `PP\Env` over repeated ad hoc `getenv()` parsing in documented Prisma PHP code paths
- use `Env::string(...)`, `Env::bool(...)`, and `Env::int(...)` for typed access with defaults
- use `Env::get(...)` when raw nullable string access is actually needed
- remember that `PP\Env` reads values from `getenv()`, `$_ENV`, and `$_SERVER`; it does not parse `.env` by itself
- keep secrets and deployment-specific settings in `.env` or the real runtime environment, not hardcoded in route files or components

## WebSocket rules

When the task involves realtime messaging, presence, live dashboards, chat, `pp.socket(...)`, or `Ratchet`, read `websocket.md` first.

Prisma PHP realtime support is built on **named sockets**: `pp.socket(name, args, handlers)` in the browser, and a Ratchet-based server under `src/Lib/Websocket` that dispatches each connection to a handler registered with `SocketRegistry`. Do not replace that default with Socket.IO, a separate Node server, raw `new WebSocket(...)` wiring, or an unrelated hosted realtime service unless the user explicitly asks for a different architecture.

Use this websocket workflow:

1. read `websocket.md`
2. inspect whether websocket support is enabled in `prisma-php.json` in the target app
3. inspect `src/Lib/Websocket`, especially `sockets.php` for the registered socket names
4. inspect the route script that calls `pp.socket(...)`
5. inspect `settings/restart-websocket.ts` when local restart behavior matters
6. inspect framework internals only when the docs do not answer the task

Important websocket rules:

- connect from the browser with `pp.socket(name, args, handlers)`; do **not** generate raw `new WebSocket(...)` wiring for app realtime work
- register server handlers with `SocketRegistry::register(...)` in `src/Lib/Websocket/sockets.php`; socket names are unique application-wide
- do not put socket handlers in route files — route files are not loaded by the socket server process
- keep the wire contract intact: one endpoint (`/__pulsepoint/ws`), the function named in the `name` query parameter, arguments as the connection's first JSON frame, one JSON value per frame in either direction, and `{"error": "..."}` (that key alone) reserved for failures
- use `src/Lib/Websocket/websocket-server.php` as the source of truth for startup behavior
- use `src/Lib/Websocket/ConnectionManager.php` as the wire and lifecycle boundary (handshake security, argument frame, dispatch, limits)
- use `SocketPool` for broadcasts; keep authenticated and guest traffic in separate pools
- declare auth with `requireAuth` / `allowedRoles` at registration; the handshake is verified against the JWT auth cookie before the handler runs
- a `Socket::send(...)` that returns `false` means the browser is gone — stop sending, it is not an error
- preserve documented env vars and defaults: `WS_NAME`, `WS_VERSION`, `WS_HOST`, `WS_PORT`, `WS_VERBOSE`, `APP_TIMEZONE`, `MAX_WEBSOCKET_CONNECTIONS`, `MAX_WEBSOCKET_MESSAGE_BYTES`, `MAX_WEBSOCKET_MESSAGES_PER_WINDOW`, `WEBSOCKET_RATE_WINDOW_SECONDS`, `WEBSOCKET_IDLE_TIMEOUT_SECONDS`, `WEBSOCKET_ALLOWED_ORIGINS`
- preserve CLI overrides through `--host=...`, `--port=...`, and `--verbose=...`
- preserve the documented casing `src/Lib/Websocket`
- in development, `settings/bs-config.ts` proxies `/__pulsepoint/ws` from the BrowserSync origin to the Ratchet server, so `pp.socket(...)` needs no `url` option; pass `url` only outside that proxy
- for existing apps, enable `websocket` in `prisma-php.json` and run `npx pp update project -y` before inventing manual scaffolding

## MCP rules

When the task involves Model Context Protocol support, read `mcp.md` first.

Prisma PHP MCP support follows the documented `PhpMcp\Server` model with attribute-based tool discovery. Do not replace it with custom REST endpoints pretending to be MCP, hand-rolled JSON-RPC parsing, or unrelated agent abstractions when the documented Prisma PHP stack already fits the task.

Use this MCP workflow:

1. read `mcp.md`
2. inspect whether MCP support is enabled in `prisma-php.json` in the target app
3. inspect `src/Lib/MCP`
4. inspect tool classes and the services they call
5. inspect auth, ORM, and env configuration when tools read protected or database-backed data
6. inspect framework internals only when the docs do not answer the task

Important MCP rules:

- use `src/Lib/MCP/mcp-server.php` as the source of truth for startup behavior
- preserve attribute-based discovery with `#[McpTool]` and `#[Schema]`
- preserve the documented discovery model built around scanning the source tree instead of manually wiring every tool class by default
- preserve the documented casing `src/Lib/MCP`
- preserve documented env vars and defaults: `MCP_NAME`, `MCP_VERSION`, `MCP_HOST`, `MCP_PORT`, `MCP_PATH_PREFIX`, `MCP_JSON_RESPONSE`, `APP_TIMEZONE`
- for existing apps, enable `mcp` in `prisma-php.json` and run `npx pp update project -y` before inventing manual scaffolding

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

Important ORM rules:

- do **not** use `npx pp update project -y` as the normal fix for Prisma ORM schema changes
- use `npx prisma migrate dev` for the normal development migration workflow
- use `npx prisma migrate deploy` for production or CI/CD migration application
- use `npx prisma db push` only for explicit prototyping or no-migration database sync
- do **not** treat `npx ppo generate` as a migration step

## Validation rules

When a task involves user input, form handling, search params, JSON payloads, `pp.rpc(...)`, `route.php` bodies, or tool parameters, do not trust raw values.

Default Prisma PHP validation rules:

- use `PP\Validator` as the backend validation and normalization layer
- prefer the `Rule` builder for rule-based validation
- start `Rule` builders with `Rule::required()`, `Rule::optional()`, or `Rule::make()`
- chain rule methods such as `->min(...)`, `->max(...)`, `->email()`, and `->regex(...)` on that builder instance
- do **not** generate static calls such as `Rule::max(80)`; for optional constrained fields use `Rule::optional()->max(80)` or `Rule::make()->max(80)`
- validate in PHP even when the frontend already performs local checks
- return structured validation results for expected failures
- do not treat routine invalid input as an uncaught exception
- in reactive flows, use PulsePoint for local state and `Validator` for authoritative server validation

When internals matter, the documented Prisma PHP core validator location is:

```txt
vendor/tsnc/prisma-php/src/Validator.php
vendor/tsnc/prisma-php/src/Rule.php
```

## PulsePoint rules

When a task involves reactive frontend behavior, read `pulsepoint.md` first.

Also follow these rules:

- treat PulsePoint as the primary JavaScript authoring model for normal full-stack frontend work
- keep page and imported-partial client logic inside the boundary's plain `<script>` tag instead of building extra DOM-ready or self-executing wrappers
- prefer `pp.rpc(...)` over ad hoc `fetch('/api/...')` calls for page-local PHP interactions
- reserve plain browser JavaScript outside PulsePoint for external libraries, low-level browser APIs, and reusable helpers in `ts/`
- do not invent undocumented PulsePoint helpers or directives
- do not write React, Vue, Alpine, or Livewire syntax and call it PulsePoint
- keep backend concerns separate from PulsePoint runtime concerns
- prefer simple documented runtime primitives over abstractions copied from other ecosystems
- do not treat app-registered helpers such as `twMerge(...)` as PulsePoint built-ins; route those tasks through the Tailwind-enabled Prisma PHP docs after checking feature flags
- use `pp-style` whenever inline CSS contains `{...}` interpolation or any other template-driven/reactive value, and reserve plain `style` for fully static inline CSS
- do **not** generate reactive inline CSS inside a plain `style` attribute such as `style="width: {progress}%";` use `pp-style="width: {progress}%";` instead so source markup stays editor-friendly
- use `pp-spread="{...attrs}"` for dynamic attribute objects and omit nullish values from those objects
- use `pp-for` only on `<template>` with `item in items` or `(item, index) in items`
- use plain `key` for keyed diffing; do not invent `pp-key`
- use `pp.ref(...)`, `pp-ref`, `pp.portal(...)`, `pp.createContext(...)`, `Context.Provider`, and `pp.context(...)` according to `pulsepoint.md`
- use `value`, `defaultvalue`, and `defaultchecked` form bindings according to `pulsepoint.md`; do not author internal `data-pp-*` form attributes

## Component rules

When the task involves Prisma PHPX components, reusable UI elements, props, children, fragments, icons, buttons, accordions, or component composition, read `components.md` first.

Also follow these rules:

- do not assume React, Vue, Blade, or generic templating component behavior maps directly to Prisma PHPX
- use HTML-first `x-` tags such as `<x-button>` and `<x-search />` when generating template markup for class-based components
- use kebab-case component attributes and rely on the runtime to hydrate camelCase PHPX properties and PulsePoint props
- keep component file names and class names aligned
- preserve documented PHPX patterns for `$props`, `$children`, `$class`, and `getAttributes(...)`
- in Tailwind-enabled apps, use `getMergeClasses(...)` and `PP\PHPX\TwMerge::merge(...)` as emitters of frontend `twMerge(...)` expressions instead of finalizing Tailwind class conflicts in PHP
- when a route or imported partial needs direct Tailwind-aware class composition, treat `twMerge(...)` as an app-level browser helper available only when `tailwindcss` is enabled
- follow documented component placement and grouping conventions before inspecting framework internals

## When to inspect framework internals

Inspect framework internals only when the docs and current files do not answer the task.

Useful app-mode core locations include:

```txt
vendor/tsnc/prisma-php/src
vendor/tsnc/prisma-php/src/PHPX/PHPX.php
vendor/tsnc/prisma-php/src/PHPX/TwMerge.php
vendor/tsnc/prisma-php/src/PHPX/TemplateCompiler.php
vendor/tsnc/prisma-php/src/ImportComponent.php
vendor/tsnc/prisma-php/src/MainLayout.php
vendor/tsnc/prisma-php/src/PrismaPHPSettings.php
vendor/tsnc/prisma-php/src/Request.php
vendor/tsnc/prisma-php/src/Attributes/Exposed.php
vendor/tsnc/prisma-php/src/Attributes/ExposedRegistry.php
vendor/tsnc/prisma-php/src/Env.php
vendor/tsnc/prisma-php/src/Rule.php
vendor/tsnc/prisma-php/src/PHPMailer/Mailer.php
vendor/tsnc/prisma-php/src/FileManager/UploadFile.php
vendor/tsnc/prisma-php/src/Validator.php
vendor/tsnc/prisma-php/src/Streaming/SSE.php
vendor/tsnc/prisma-php/src/Streaming/ServerSentEvent.php
```

Use framework internals when the task involves:

- confirming namespaces, classes, or helper names
- understanding how a core class behaves internally
- verifying available attributes such as `#[Exposed]`, `#[McpTool]`, or `#[Schema]`
- checking PHPX compiler or template compiler behavior
- tracing PulsePoint integration points inside Prisma PHP
- confirming mailer, SSE, websocket, or MCP runtime behavior not already clear from the docs
- debugging framework-level issues that are not explained by the current docs

For ordinary app or docs work, prefer the current docs and local project files first.

## Upgrade and feature-enable workflow

If the task involves enabling a feature, syncing framework-managed files, or updating the project structure, read `upgrading.md` first.

Important rules:

- update `prisma-php.json` before assuming a feature is active in a consumer app
- do not assume Tailwind, Prisma, Swagger, WebSocket, MCP, or TypeScript support is enabled unless `prisma-php.json` says so
- keep customized framework-managed files such as `src/Lib/Auth/AuthConfig.php` in `excludeFiles` when you need project updates to preserve them
- after changing feature flags, follow the documented project update flow
- for AI-driven or scripted updates, prefer `npx pp update project -y`

That command is for project updates and framework-managed file refreshes. It is not the default ORM migration command.

## Final operating rule

When Prisma PHP behavior is documented locally, read the relevant current doc first and follow it.

Do not guess.

<!-- END:prisma-php-agent-rules -->
