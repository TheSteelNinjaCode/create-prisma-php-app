# Project Guidelines

## Source Of Truth

- Use `./prisma-php.json` as the single source of truth for which optional Prisma PHP features are enabled in the current app and which framework-managed scaffolds should exist.
- For Prisma PHP applications, treat `node_modules/prisma-php/dist/docs/index.md` as the entry point for the installed framework version.
- Treat `node_modules/prisma-php/dist/docs` as framework reference docs that teach AI how Prisma PHP works. The presence of a page in that docs folder does not mean the current workspace has that feature enabled.
- Read the matching doc in `node_modules/prisma-php/dist/docs` before generating or editing framework-specific Prisma PHP code.
- Expect `AGENTS.md` in the project root and keep it aligned with the installed Prisma PHP docs contract.
- In the Prisma PHP package source repo, keep the source-repo `AGENTS.md`, `.github/copilot-instructions.md`, any `.github/instructions/**/*.instructions.md`, and source-repo `dist/docs` aligned so the published docs remain correct after install. In consumer apps, the installed docs path is `node_modules/prisma-php/dist/docs`.
- Do not assume installed consumer apps also ship a root `.github/copilot-instructions.md` unless the generator explicitly creates one.
- If `.github/instructions/**/*.instructions.md` exists, treat those files as workspace-local task instructions for third-party libraries, component systems, icon packs, and other implementation-specific rules.
- Before generating or editing code, inspect `.github/instructions/` and read any `*.instructions.md` files that match the current task, named library, target files, or implementation surface.
- In the Prisma PHP package source repo, keep every `dist/docs/*.md` page AI-discoverable on its own. In consumer apps, those installed docs live at `node_modules/prisma-php/dist/docs/*.md`. The frontmatter description and opening section should clearly say when agents should read that file and which adjacent docs to consult next.
- When a task maps to an optional feature such as `backendOnly`, `swaggerDocs`, `typescript`, `websocket`, or `mcp`, inspect `./prisma-php.json` first, then read the matching docs page to learn the implementation contract.
- When docs and project files still leave a runtime gap, inspect the narrow core file that owns the behavior: `TemplateCompiler.php` for HTML fragment compilation and route root scoping, `PHPX.php` plus `TwMerge.php` for PHPX class composition and frontend `twMerge(...)` emission, `ImportComponent.php` for imported partials, `MainLayout.php` for metadata and head/footer scripts, `PrismaPHPSettings.php` plus generated settings JSON for component and route maps, `Request.php` for request handling, `Validator.php`/`Rule.php` for validation, and feature-specific files such as `UploadFile.php`, `Mailer.php`, or `Streaming/SSE.php`.
- When validation or rule-builder syntax is involved, read `node_modules/prisma-php/dist/docs/validator.md` first. If method shape is still unclear after that, inspect `vendor/tsnc/prisma-php/src/Rule.php` to confirm which `Rule` methods are static entry points and which methods must be chained on a builder instance.

## Workspace Task Instructions

- Treat `.github/instructions/**/*.instructions.md` as an optional task-specific extension of the Prisma PHP docs contract.
- Use those instruction files when the task mentions a library, pattern, or file surface they cover, such as a PHPXUI component library, `ppicons`, or another workspace-specific integration.
- Keep `./prisma-php.json` as the source of truth for Prisma PHP feature flags and generated scaffolds; use `.github/instructions/**/*.instructions.md` to refine task-specific implementation details and prefer the most specific matching instruction when more than one applies.
- When generating or updating PHP `use` imports for components from the same namespace or generated library directory, prefer grouped imports once a file needs two or more symbols, such as `use Lib\PPIcons\{ArrowRight, Mail};` or `use Lib\PHPXUI\{Badge, Button};`.
- Single imports remain fine when only one component is needed, and existing separate imports do not need style-only cleanup unless the task asks for it.

## Project Structure Recommendations

- Keep `src/app` focused on route files, layouts, handlers, and route-scoped partials.
- Prefer `src/Components` for reusable application UI components shared across pages or layouts.
- Keep reusable non-UI code such as services, auth, middleware, Prisma classes, and helpers in `src/Lib`.
- Treat route-private folders such as `src/app/<route>/_components` as an implementation detail for files that stay owned by that route only.
- Treat `./public/uploads` as the default local public upload directory for file uploads.
- Treat generated component libraries such as `src/Lib/PHPXUI` and `src/Lib/PPIcons` as library-specific surfaces governed by their manifests and `.github/instructions/*.instructions.md` files.
- If a partial starts as route-local but becomes shared across the app, move it from `src/app` to `src/Components`.
- Do not default to creating `src/app/<route>/_components` for app-owned section components such as `HeroSection`, `FormSection`, or `SidebarSection`; prefer `src/Components` unless the user explicitly wants route-local colocation and the files are truly private to that route.
- Suggest this structure by default when helping users organize growing Prisma PHP apps.

## Component Tag Contract

- Class-based PHPX components and generated icon components are consumed with HTML-first `x-` tags from `settings/component-map.json`, such as `<x-alert>` or `<x-search />`.
- Use the `tagName` entries in `settings/component-map.json` as the supported runtime contract for component and icon markup.
- Do not invent `x-` tag names from PHP class names when the generated map exists; inspect `settings/component-map.json`.
- Keep documentation, examples, and generated code focused on the current `x-` tag contract.
- Author component attributes in kebab-case. The runtime hydrates kebab-case names into camelCase component props and public PHPX properties, such as `as-child` -> `asChild` and `close-on-escape-key` -> `closeOnEscapeKey`.
- Use mustache values for reactive props, such as `selected-date="{selectedDate}"` and `on-date-select="{setSelectedDate}"`.
- Write component examples as HTML-first Prisma PHP markup using the current `x-` tag contract.

## Tailwind Merge Contract

- In Tailwind-enabled Prisma PHP apps, Tailwind utility conflict resolution belongs to the frontend `twMerge(...)` runtime helper.
- `getMergeClasses(...)` and `PP\PHPX\TwMerge::merge(...)` emit frontend `twMerge(...)` expressions for the browser runtime to resolve.
- `twMerge(...)` is an app-level browser helper, not a PulsePoint built-in.
- In TypeScript-enabled apps, Prisma PHP registers that helper from `ts/main.ts`; in non-TypeScript Tailwind apps it is registered from `public/js/main.js` (importing `public/js/tailwind-merge.mjs`). Use `typescript.md` for route usage and `components.md` for PHPX usage.
- Keep Tailwind merge decisions on the frontend runtime instead of trying to finalize conflicting utility classes in PHP.

## Framework-Managed Package Scripts

- Prisma PHP can generate `package.json` scripts for BrowserSync, Tailwind, TypeScript, WebSocket, MCP, Swagger docs, and related helpers.
- Prefer `npm run dev` for ordinary local development and `npm run build` for ordinary production-style asset builds.
- Do not default to telling users to run `npm run tailwind`, `npm run tailwind:build`, `npm run ts:watch`, or `npm run ts:build` after routine file changes, because those are usually orchestrated through the generated top-level scripts.
- Use `npm run websocket` or `npm run mcp` only when isolating local runtime startup, debugging, or when the project's scripts show those services are not already covered by the normal development flow.
- Use `npm run create-swagger-docs` only when Swagger or OpenAPI output must be intentionally generated or refreshed.
- When package-script behavior matters, read `node_modules/prisma-php/dist/docs/commands.md` first and inspect the actual `package.json` in the target project before assuming which scripts exist.

## BrowserSync URL Source Of Truth

- When AI needs to test or confirm whether a route, server response, or proxy-backed request is working, use `./settings/bs-config.json` as the source of truth for the current BrowserSync URLs.
- Do not assume the proxy stays on the default `http://localhost:5090`; if that port is busy, the active BrowserSync ports may change.
- Prefer confirming the current `local`, `external`, `ui`, and `uiExternal` values in `./settings/bs-config.json` before suggesting a test URL or opening the app in the browser.
- Use this file when frontend console errors or terminal output suggest the wrong local URL, proxy port, or BrowserSync UI port is being used during debugging.

## File Upload Defaults

- For local public uploads, default to `./public/uploads`.
- In PHP examples and generated code, use `PUBLIC_PATH . '/uploads/'` or the equivalent absolute `./public/uploads` path.
- Treat files in `./public/uploads` as publicly accessible from the app's public web root.
- Keep `./settings/bs-config.ts` aligned with `const PUBLIC_IGNORE_DIRS = ["uploads"];` so upload writes, renames, replacements, and deletes do not trigger BrowserSync reloads.
- Do not document or generate legacy local upload directories such as `DOCUMENT_PATH . '/uploads/'`, a project-root `/uploads`, or `src/uploads`.
- There is no backward-compatible or legacy local upload directory in this guidance.

## CLI Command Alignment

- For new apps, prefer `npx create-prisma-php-app <project-name>` as the default recommended create command.
- For existing apps, prefer `npx pp update project` after saving feature changes in `prisma-php.json`.
- When an existing app needs a specific release channel or pinned update version, prefer `npx pp update project --tag <value>` or `npx pp update project --tag=<value>`.
- Use `--tag <value>` or `--tag=<value>` for release-channel or pinned-version updates.
- Do not use `npx pp update project` as a substitute for Prisma ORM migration commands.

## Authentication Route Strategy

- Prisma PHP defaults to public routes.
- Auth classes are app-owned under `src/Lib/Auth` in the `Lib\Auth` namespace: `use Lib\Auth\Auth;`, `use Lib\Auth\AuthConfig;`, `use Lib\Auth\AuthRole;` — never `PP\Auth\...`.
- Choose the route privacy strategy at the start of the app, before creating most routes.
- If the app will have many public pages, keep the public-default strategy.
- If the app will have only a few public entry points and most routes should require login, use the private-default strategy.
- For private-default routing, enable both `IS_ALL_ROUTES_PRIVATE = true` and `IS_TOKEN_AUTO_REFRESH = true` in `src/Lib/Auth/AuthConfig.php`.
- When `IS_ALL_ROUTES_PRIVATE` is `true`, Prisma PHP treats routes as private by default and uses `publicRoutes` for the public allowlist; home is already public by default because `publicRoutes` starts as `['/']`.
- Keep `authRoutes` public by default unless the user explicitly asks to change them.
- There is no need to modify other Prisma PHP core files for this route privacy behavior.
- If `src/Lib/Auth/AuthConfig.php` is customized, preserve it during future Prisma PHP project updates by adding `./src/Lib/Auth/AuthConfig.php` to `excludeFiles` in `prisma-php.json`.

## PulsePoint-First Frontend Rules

- In full-stack Prisma PHP apps, treat PulsePoint as the primary JavaScript authoring model for frontend behavior.
- For page-local interactivity, prefer `index.php` or nested `layout.php` with a plain inline `<script>` that contains PulsePoint state and functions directly, and use `pp.rpc(...)` for backend calls.
- Do not wrap inline PulsePoint code in `DOMContentLoaded`, IIFEs, manual `pp.mount()` calls, or custom scoping/bootstrap helpers. Prisma PHP scopes the component boundary and runs the script for you.
- Reserve plain browser JavaScript or TypeScript modules for reusable helpers in `ts/`, third-party libraries, low-level browser APIs, or behavior that does not belong inside a PulsePoint component boundary.
- Do not treat app-registered helpers such as `twMerge(...)` as PulsePoint built-ins; only use them after the relevant Prisma PHP feature flag and entry-file docs confirm they exist.
- Use `pp-style` whenever inline CSS contains `{...}` interpolation or any other template-driven/reactive value, reserve plain `style` for fully static inline CSS, use `pp-spread="{...attrs}"` for dynamic attribute objects, keep `pp-for` only on `<template>`, and use plain `key` for keyed diffing.
- Do not generate reactive inline CSS inside a plain `style` attribute such as `style="width: {progress}%";` use `pp-style="width: {progress}%";` instead so editor CSS validation does not flag the source markup as invalid.
- Use `pp.ref(...)`, `pp-ref`, `pp.portal(...)`, `pp.createContext(...)`, `Context.Provider`, and `pp.context(...)` according to `pulsepoint.md`.
- Use `value`, `defaultvalue`, and `defaultchecked` form bindings according to `pulsepoint.md`; do not author internal `data-pp-*` runtime attributes.

## Runtime Wire Contract

- `pp.rpc(functionName, data?, optionsOrAbort?)` is the frontend-to-PHP call API.
- Every function called through `pp.rpc(...)` must be marked `#[Exposed]` on the PHP side.
- Framework-level RPC failures (unknown function, auth, roles, CSRF, origin, content type, rate limit, server error) arrive as HTTP error statuses with an `{"error": "..."}` JSON body and reject the `pp.rpc(...)` promise; wrap calls in `try/catch` when the UI reacts to failures. Return routine validation feedback as structured data instead of throwing. Throwing `InvalidArgumentException` in an exposed function is the sanctioned validation crossover: its message reaches the caller as a 400.
- Streamed responses: an exposed function that yields streams SSE `data:` lines; consume them with `onStream`, `onStreamError`, and `onStreamComplete`.
- CSRF: the runtime reads the `pp_csrf` cookie family (`pp_csrf_<port>` in development, `pp_csrf` otherwise), managed server-side by `PP\Security\Csrf` and signed with `FUNCTION_CALL_SECRET`.
- Realtime: use `pp.socket(name, args, handlers)` (named sockets) for long-lived bidirectional flows. Server handlers are registered with `SocketRegistry::register(...)` in `src/Lib/Websocket/sockets.php`; the wire is one endpoint (`/__pulsepoint/ws?name=...`), arguments as the first JSON frame, JSON frames both ways, and `{"error": "..."}` reserved for failures. Do not generate raw `new WebSocket(...)` wiring for app realtime work.
- Read `node_modules/prisma-php/dist/docs/fetching-data.md`, `bootstrap-runtime.md`, and `websocket.md` for the full contracts.

## Route File Conventions

- For PulsePoint-aware `index.php` and nested `layout.php`, keep file order as PHP first, then one parent HTML element as the route boundary, then the visible route content inside that boundary, and keep the PulsePoint `<script>` as the last child of that boundary root.
- `index.php` and nested `layout.php` must render a single parent HTML element. Treat that root like a component boundary rather than loose sibling markup.
- If the visible page or layout content should stay inside a semantic element such as `<main>`, `<section>`, or `<article>`, wrap it in a neutral parent such as `<div>` so the route boundary can still own the `<script>`.
- For pages and nested layouts, author a plain single root element and let Prisma PHP inject the PulsePoint `pp-component` scope automatically.
- Author plain `<script>` tags inside that boundary root when PulsePoint is needed, usually as a sibling of the visible content container instead of nesting the script inside the semantic content element by default. Put the PulsePoint code at the top level of that script. Never put a `type` attribute on a component script — the runtime only recognizes untyped scripts. Do not add `DOMContentLoaded` wrappers, IIFEs, or manual bootstrap code.
- Do not leave the route `<script>` outside the route boundary.
- Only the root `layout.php` should define `<html>`, `<head>`, and `<body>`. When PulsePoint is present, keep `MainLayout::$children;` and any `<script>` inside one clear wrapper.

## Component Boundary Rules

- Distinguish PHPX class components from `ImportComponent` partials.
- `ImportComponent` partials must output exactly one root element because Prisma PHP uses that root as the imported component boundary and serializes props there.
- Do not manually add `pp-component` inside `ImportComponent` partial source; Prisma PHP injects it there.
- When imported partials need PulsePoint logic, keep the `<script>` inside that same root element and author it as a plain `<script>` tag with no `type` attribute (the runtime ignores typed scripts), without DOM-ready wrappers or manual bootstrap code.

## Validation Rules

- Use `PP\Validator` as the backend validation and normalization layer.
- Prefer the `Rule` builder for rule-based validation.
- Start `Rule` builders with `Rule::required()`, `Rule::optional()`, or `Rule::make()`.
- Chain rule methods such as `->min(...)`, `->max(...)`, `->email()`, and `->regex(...)` on that builder instance.
- Do not generate static calls such as `Rule::max(80)` or `Rule::email()`.
- For optional constrained fields, use `Rule::optional()->max(80)` or `Rule::make()->max(80)`.
- Validate in PHP even when the frontend already performs local checks.
- Return structured validation results for expected failures instead of treating routine invalid input as an uncaught exception.
- When internals matter, inspect `vendor/tsnc/prisma-php/src/Validator.php` and `vendor/tsnc/prisma-php/src/Rule.php`.

## Testing Rules

- App tests live in the root `tests/` directory and run with `npm run test` (PHPUnit via `settings/run-tests.ts`, using the PHP binary from `prisma-php.json`). Narrow runs with `npm run test -- --filter <NameOrMethod>`.
- When adding or changing app behavior with logic worth protecting (exposed-function validation, socket handlers, auth rules, `src/Lib` helpers), add or update the matching `tests/*Test.php` in the same change and run `npm run test` before declaring the work done.
- Tests cover app-level code and the wire contracts the app depends on; do not test Prisma PHP framework internals from the app suite.
- Tests of optional features (`websocket`, `mcp`, `swaggerDocs`, `prisma`, ...) must guard on the `prisma-php.json` flag via the `Tests\Support\RequiresFeature` trait (`$this->requireFeature('websocket')` as the first line of `setUp()`), so a disabled feature skips cleanly instead of fataling on missing scaffold classes. Core surfaces (CSRF, wire headers, auth) are never gated.
- `tests/bootstrap.php` sets a deterministic env (no real `.env`); shared fakes live in `tests/Support` (`Tests\Support\...`). Socket wire tests use `Tests\Support\FakeConnection` and assert frames plus close codes.
- Read `node_modules/prisma-php/dist/docs/testing.md` and the project's `tests/README.md` before writing tests.

## Relevant Docs

- Project structure and feature placement: `node_modules/prisma-php/dist/docs/project-structure.md`
- CLI project creation and update commands: `node_modules/prisma-php/dist/docs/commands.md`
- First-time project installation and local setup: `node_modules/prisma-php/dist/docs/installation.md`
- Existing-project upgrades and feature refreshes: `node_modules/prisma-php/dist/docs/upgrading.md`
- TypeScript frontend tooling, the `typescript` flag, and `ts/main.ts` registration: `node_modules/prisma-php/dist/docs/typescript.md`
- Backend-only API usage and `backendOnly`: `node_modules/prisma-php/dist/docs/backend-only.md`
- Route and layout structure: `node_modules/prisma-php/dist/docs/layouts-and-pages.md`
- AI integration, provider-backed chat, streaming, and MCP boundary: `node_modules/prisma-php/dist/docs/get-started-ia.md`
- Data loading, `#[Exposed]`, and SSE streaming: `node_modules/prisma-php/dist/docs/fetching-data.md`
- Bootstrap flow, runtime init order, request initialization, and function-call protection: `node_modules/prisma-php/dist/docs/bootstrap-runtime.md`
- PulsePoint runtime rules: `node_modules/prisma-php/dist/docs/pulsepoint.md`
- Component and `ImportComponent` rules: `node_modules/prisma-php/dist/docs/components.md`
- Frontend Tailwind class composition and `twMerge(...)`: `node_modules/prisma-php/dist/docs/components.md`, `node_modules/prisma-php/dist/docs/typescript.md`, and `node_modules/prisma-php/dist/docs/layouts-and-pages.md`
- Cache behavior and `CacheHandler`: `node_modules/prisma-php/dist/docs/caching.md`
- Validation rules: `node_modules/prisma-php/dist/docs/validator.md`
- Prisma ORM schema, migrations, and generated PHP classes: `node_modules/prisma-php/dist/docs/prisma-php-orm.md`
- Environment variables and `PP\Env` usage: `node_modules/prisma-php/dist/docs/env.md`
- File uploads and file manager behavior: `node_modules/prisma-php/dist/docs/file-manager.md`
- Email and SMTP workflows: `node_modules/prisma-php/dist/docs/email.md`
- WebSocket and realtime behavior: `node_modules/prisma-php/dist/docs/websocket.md`
- MCP server and tool rules: `node_modules/prisma-php/dist/docs/mcp.md`
- Authentication: `node_modules/prisma-php/dist/docs/authentication.md`
- Error handling, expected failures, and route error files: `node_modules/prisma-php/dist/docs/error-handling.md`
- Metadata and icons: `node_modules/prisma-php/dist/docs/metadata-and-og-images.md`
- API-style handlers and webhooks: `node_modules/prisma-php/dist/docs/route-handlers.md`
- Swagger/OpenAPI generation and `swaggerDocs`: `node_modules/prisma-php/dist/docs/swagger-docs.md`
- App test suite, `tests/` layout, and `npm run test`: `node_modules/prisma-php/dist/docs/testing.md`
