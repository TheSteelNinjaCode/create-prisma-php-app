<!-- BEGIN:prisma-php-agent-rules -->

# Prisma PHP: always read the docs and project manifest before coding

Before any Prisma PHP work, read the relevant installed docs in `node_modules/prisma-php/dist/docs/`.

Do not rely on assumptions from other frameworks. The bundled docs are the source of truth for the installed version.

## Read `prisma-php.json` first

Before generating code or making framework decisions, read `./prisma-php.json`.

Treat it as the source of truth for enabled project capabilities such as:

- `tailwindcss`
- `backendOnly`
- `swaggerDocs`
- `websocket`
- `mcp`
- `prisma`
- `typescript`

Also use it to confirm environment-specific details such as:

- project root path
- PHP executable path
- BrowserSync target and path rewriting
- component scan directories
- excluded files

## Read PulsePoint docs when UI reactivity is involved

If the task involves PulsePoint state, effects, refs, directives, frontend interactivity, or reactive UI behavior, read `10-pulse-point.md` before generating code.

Treat `10-pulse-point.md` as the source of truth for PulsePoint runtime usage, allowed APIs, markup directives, file layout expectations, and reactive browser-side patterns.

Do not invent PulsePoint helpers, directives, or APIs that are not explicitly documented there.

## Decision rules for AI agents

- Do not assume a feature is enabled unless it is present and enabled in `prisma-php.json`.
- Do not generate BackendOnly-specific code unless `backendOnly` is enabled.
- Do not generate Tailwind-based UI unless `tailwindcss` is enabled.
- Do not generate Prisma ORM setup or usage unless `prisma` is enabled.
- Do not generate TypeScript tooling or TS examples unless `typescript` is enabled.
- Do not generate MCP-related guidance unless `mcp` is enabled.
- Do not generate websocket-specific setup unless `websocket` is enabled.
- If `backendOnly` is `true`, avoid frontend-oriented setup unless the user explicitly asks for it.
- When routing, layouts, middleware, or file conventions are involved, read the relevant Prisma PHP docs first.
- When working with PulsePoint-powered UI, read `10-pulse-point.md` first and follow its rules strictly.
- Do not assume behavior from React, Vue, Alpine, Livewire, or other frontend systems when generating PulsePoint code.

## Priority order

When working in a Prisma PHP project, use this order of truth:

1. The user's explicit request
2. The installed Prisma PHP docs for the current version
3. `10-pulse-point.md` for PulsePoint-specific runtime behavior and reactive UI rules
4. `./prisma-php.json`
5. Existing project code and structure

<!-- END:prisma-php-agent-rules -->
