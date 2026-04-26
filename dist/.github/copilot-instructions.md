# Project Guidelines

## Source Of Truth

- Use `./prisma-php.json` as the single source of truth for which optional Prisma PHP features are enabled in the current app and which framework-managed scaffolds should exist.
- For Prisma PHP applications, treat `node_modules/prisma-php/dist/docs/index.md` as the entry point for the installed framework version.
- Treat `node_modules/prisma-php/dist/docs` as framework reference docs that teach AI how Prisma PHP works. The presence of a page in that docs folder does not mean the current workspace has that feature enabled.
- Read the matching doc in `node_modules/prisma-php/dist/docs` before generating or editing framework-specific Prisma PHP code.
- Expect `AGENTS.md` in the project root and keep it aligned with the installed Prisma PHP docs contract.
- In the Prisma PHP package source repo, keep `AGENTS.md`, `.github/copilot-instructions.md`, any `.github/instructions/**/*.instructions.md`, and `dist/docs` aligned so the published docs remain correct after install.
- Do not assume installed consumer apps also ship a root `.github/copilot-instructions.md` unless the generator explicitly creates one.
- If `.github/instructions/**/*.instructions.md` exists, treat those files as workspace-local task instructions for third-party libraries, component systems, icon packs, and other implementation-specific rules.
- Before generating or editing code, inspect `.github/instructions/` and read any `*.instructions.md` files that match the current task, named library, target files, or implementation surface.
- Keep every `dist/docs/*.md` page AI-discoverable on its own: the frontmatter description and opening section should clearly say when agents should read that file and which adjacent docs to consult next.
- When a task maps to an optional feature such as `backendOnly`, `swaggerDocs`, `typescript`, `websocket`, or `mcp`, inspect `./prisma-php.json` first, then read the matching docs page to learn the implementation contract.
- When docs and project files still leave a runtime gap, inspect the narrow core file that owns the behavior: `TemplateCompiler.php` for HTML fragment compilation and route root scoping, `ImportComponent.php` for imported partials, `MainLayout.php` for metadata and head/footer scripts, `PrismaPHPSettings.php` plus generated settings JSON for component and route maps, `Request.php` for request handling, `Validator.php`/`Rule.php` for validation, and feature-specific files such as `UploadFile.php`, `Mailer.php`, or `Streaming/SSE.php`.

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
- Treat generated component libraries such as `src/Lib/PHPXUI` and `src/Lib/PPIcons` as library-specific surfaces governed by their manifests and `.github/instructions/*.instructions.md` files.
- If a partial starts as route-local but becomes shared across the app, move it from `src/app` to `src/Components`.
- Suggest this structure by default when helping users organize growing Prisma PHP apps.

## Component Tag Contract

- Class-based PHPX components and generated icon components are consumed with HTML-first `x-` tags from `settings/component-map.json`, such as `<x-alert>` or `<x-search />`.
- Use the `tagName` entries in `settings/component-map.json` as the supported runtime contract for component and icon markup.
- Do not invent `x-` tag names from PHP class names when the generated map exists; inspect `settings/component-map.json`.
- Keep documentation, examples, and generated code focused on the current `x-` tag contract.
- Author component attributes in kebab-case. The runtime hydrates kebab-case names into camelCase component props and public PHPX properties, such as `as-child` -> `asChild` and `close-on-escape-key` -> `closeOnEscapeKey`.
- Use mustache values for reactive props, such as `selected-date="{selectedDate}"` and `on-date-select="{setSelectedDate}"`.
- Write component examples as HTML-first Prisma PHP markup using the current `x-` tag contract.

## Framework-Managed Package Scripts

- Prisma PHP can generate `package.json` scripts for BrowserSync, Tailwind, TypeScript, WebSocket, MCP, Swagger docs, and related helpers.
- Prefer `npm run dev` for ordinary local development and `npm run build` for ordinary production-style asset builds.
- Do not default to telling users to run `npm run tailwind`, `npm run tailwind:build`, `npm run ts:watch`, or `npm run ts:build` after routine file changes, because those are usually orchestrated through the generated top-level scripts.
- Use `npm run websocket` or `npm run mcp` only when isolating local runtime startup, debugging, or when the project's scripts show those services are not already covered by the normal development flow.
- Use `npm run create-swagger-docs` only when Swagger or OpenAPI output must be intentionally generated or refreshed.
- When package-script behavior matters, read `dist/docs/commands.md` first and inspect the actual `package.json` in the target project before assuming which scripts exist.

## BrowserSync URL Source Of Truth

- When AI needs to test or confirm whether a route, server response, or proxy-backed request is working, use `./settings/bs-config.json` as the source of truth for the current BrowserSync URLs.
- Do not assume the proxy stays on the default `http://localhost:5090`; if that port is busy, the active BrowserSync ports may change.
- Prefer confirming the current `local`, `external`, `ui`, and `uiExternal` values in `./settings/bs-config.json` before suggesting a test URL or opening the app in the browser.
- Use this file when frontend console errors or terminal output suggest the wrong local URL, proxy port, or BrowserSync UI port is being used during debugging.

## CLI Command Alignment

- For new apps, prefer `npx create-prisma-php-app <project-name>` as the default recommended create command.
- For existing apps, prefer `npx pp update project` after saving feature changes in `prisma-php.json`.
- When an existing app needs a specific release channel or pinned update version, prefer `npx pp update project --tag <value>` or `npx pp update project --tag=<value>`.
- Use `--tag <value>` or `--tag=<value>` for release-channel or pinned-version updates.
- Do not use `npx pp update project` as a substitute for Prisma ORM migration commands.

## Authentication Route Strategy

- Prisma PHP defaults to public routes.
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
- For page-local interactivity, prefer `index.php` or nested `layout.php` with a plain inline `<script>` that contains PulsePoint state and functions directly, and use `pp.fetchFunction(...)` for backend calls.
- Do not wrap inline PulsePoint code in `DOMContentLoaded`, IIFEs, manual `pp.mount()` calls, or custom scoping/bootstrap helpers. Prisma PHP scopes the component boundary and runs the script for you.
- Reserve plain browser JavaScript or TypeScript modules for reusable helpers in `ts/`, third-party libraries, low-level browser APIs, or behavior that does not belong inside a PulsePoint component boundary.
- Use `pp-style` for template-driven inline CSS, `pp-spread="{...attrs}"` for dynamic attribute objects, `pp-for` only on `<template>`, and plain `key` for keyed diffing.
- Use `pp.ref(...)`, `pp-ref`, `pp.portal(...)`, `pp.createContext(...)`, `Context.Provider`, and `pp.context(...)` according to `pulsepoint.md`.
- Use `value`, `defaultvalue`, and `defaultchecked` form bindings according to `pulsepoint.md`; do not author internal `data-pp-*` runtime attributes.

## Route File Conventions

- For PulsePoint-aware `index.php` and nested `layout.php`, keep file order as PHP first, then one parent HTML element; keep the PulsePoint `<script>` as the last child inside that same root element.
- `index.php` and nested `layout.php` must render a single parent HTML element. Treat that root like a React-style component boundary rather than loose sibling markup.
- For pages and nested layouts, author a plain single root element and let Prisma PHP inject the PulsePoint `pp-component` scope automatically.
- Author plain `<script>` tags inside that root when PulsePoint is needed. Put the PulsePoint code at the top level of that script. Do not manually add `type="text/pp"`, `DOMContentLoaded` wrappers, IIFEs, or manual bootstrap code; Prisma PHP normalizes the script contract for the runtime.
- Only the root `layout.php` should define `<html>`, `<head>`, and `<body>`. When PulsePoint is present, keep `MainLayout::$children;` and any `<script>` inside one clear wrapper.

## Component Boundary Rules

- Distinguish PHPX class components from `ImportComponent` partials.
- `ImportComponent` partials must output exactly one root element because Prisma PHP uses that root as the imported component boundary and serializes props there.
- Do not manually add `pp-component` inside `ImportComponent` partial source; Prisma PHP injects it there.
- When imported partials need PulsePoint logic, keep the `<script>` inside that same root element and author it as a plain `<script>` tag without `type="text/pp"`, DOM-ready wrappers, or manual bootstrap code.

## Relevant Docs

- Project structure and feature placement: `dist/docs/project-structure.md`
- CLI project creation and update commands: `dist/docs/commands.md`
- First-time project installation and local setup: `dist/docs/installation.md`
- Existing-project upgrades and feature refreshes: `dist/docs/upgrading.md`
- TypeScript frontend tooling, the `typescript` flag, and `ts/main.ts` registration: `dist/docs/typescript.md`
- Backend-only API usage and `backendOnly`: `dist/docs/backend-only.md`
- Route and layout structure: `dist/docs/layouts-and-pages.md`
- AI integration, provider-backed chat, streaming, and MCP boundary: `dist/docs/get-started-ia.md`
- Data loading, `#[Exposed]`, and SSE streaming: `dist/docs/fetching-data.md`
- Bootstrap flow, runtime init order, request initialization, and function-call protection: `dist/docs/bootstrap-runtime.md`
- PulsePoint runtime rules: `dist/docs/pulsepoint.md`
- Component and `ImportComponent` rules: `dist/docs/components.md`
- Cache behavior and `CacheHandler`: `dist/docs/caching.md`
- Validation rules: `dist/docs/validator.md`
- Prisma ORM schema, migrations, and generated PHP classes: `dist/docs/prisma-php-orm.md`
- Environment variables and `PP\Env` usage: `dist/docs/env.md`
- File uploads and file manager behavior: `dist/docs/file-manager.md`
- Email and SMTP workflows: `dist/docs/email.md`
- WebSocket and realtime behavior: `dist/docs/websocket.md`
- MCP server and tool rules: `dist/docs/mcp.md`
- Authentication: `dist/docs/authentication.md`
- Error handling, expected failures, and route error files: `dist/docs/error-handling.md`
- Metadata and icons: `dist/docs/metadata-and-og-images.md`
- API-style handlers and webhooks: `dist/docs/route-handlers.md`
- Swagger/OpenAPI generation and `swaggerDocs`: `dist/docs/swagger-docs.md`
