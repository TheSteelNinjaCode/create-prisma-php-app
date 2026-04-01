<!-- BEGIN:prisma-php-agent-rules -->

# Prisma PHP: always read the docs, project manifest, upgrade guide, and installed core package paths before coding

Before any Prisma PHP work, read the relevant installed docs for the current project version.

Do not rely on assumptions from other frameworks. The installed Prisma PHP docs, project manifest, and project-specific upgrade workflow are the source of truth for the active setup.

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

## Read `upgrading.md` when updating or enabling features

If the task involves upgrading Prisma PHP, updating project files, enabling new framework capabilities, syncing project scaffolding, or installing feature-related dependencies, read `upgrading.md` first.

Treat `upgrading.md` as the source of truth for the project update workflow.

Use it when:

- enabling Prisma PHP features for an existing project
- updating project scaffolding after changing feature flags
- syncing framework-managed files with the current Prisma PHP version
- following the recommended project update command
- checking whether a feature must be enabled in `prisma-php.json` before use

Important rules:

- Before enabling any Prisma PHP feature, check and update `./prisma-php.json` first.
- Do not assume a feature is active until it is enabled in `prisma-php.json`.
- After changing feature flags or project capabilities, run the recommended project update command:

```bash
npx pp update project
```

- Use `upgrading.md` before making assumptions about dependency updates, feature activation, scaffold sync steps, or project-wide update behavior.

## Read the installed Prisma PHP core package when framework internals matter

Prisma PHP core composer package files live in:

```txt
vendor/tsnc/prisma-php/src
```

When a task involves framework internals, built-in classes, attributes, routing behavior, middleware, PHPX, PulsePoint integration points, compiler behavior, helpers, or package-level conventions, inspect this directory before making assumptions.

Use it as the installed source of truth for framework implementation details that are not fully described in the docs.

Examples of when to inspect `vendor/tsnc/prisma-php/src`:

- understanding how a core class or helper actually works
- checking framework namespaces, file names, and class locations
- verifying available attributes such as `#[Exposed]`
- reviewing PHPX or template compiler behavior
- tracing PulsePoint integration points inside Prisma PHP
- confirming conventions used by the installed version

If `prisma-php.json` includes:

```json
{
  "componentScanDirs": ["src", "vendor/tsnc/prisma-php/src"]
}
```

treat both directories as important scan targets for framework-aware code generation and component discovery.

## Read PulsePoint docs when UI reactivity is involved

If the task involves PulsePoint state, effects, refs, directives, frontend interactivity, or reactive UI behavior, read `10-pulse-point.md` before generating code.

Treat `10-pulse-point.md` as the source of truth for PulsePoint runtime usage, allowed APIs, markup directives, file layout expectations, and reactive browser-side patterns.

Do not invent PulsePoint helpers, directives, or APIs that are not explicitly documented there.

## Decision rules for AI agents

- Do not assume a feature is enabled unless it is present and enabled in `prisma-php.json`.
- Before enabling or using framework features in an existing project, check `prisma-php.json` first.
- When feature flags or project capabilities change, read `upgrading.md` and follow the documented update workflow.
- Do not generate BackendOnly-specific code unless `backendOnly` is enabled.
- Do not generate Tailwind-based UI unless `tailwindcss` is enabled.
- Do not generate Prisma ORM setup or usage unless `prisma` is enabled.
- Do not generate TypeScript tooling or TS examples unless `typescript` is enabled.
- Do not generate MCP-related guidance unless `mcp` is enabled.
- Do not generate websocket-specific setup unless `websocket` is enabled.
- If `backendOnly` is `true`, avoid frontend-oriented setup unless the user explicitly asks for it.
- When routing, layouts, middleware, or file conventions are involved, read the relevant Prisma PHP docs first.
- When working with PulsePoint-powered UI, read `10-pulse-point.md` first and follow its rules strictly.
- When framework internals or package behavior matter, inspect `vendor/tsnc/prisma-php/src` before guessing.
- Do not assume behavior from React, Vue, Alpine, Livewire, or other frontend systems when generating PulsePoint code.

## Priority order

When working in a Prisma PHP project, use this order of truth:

1. The user's explicit request
2. The installed Prisma PHP docs for the current version
3. `./prisma-php.json`
4. `upgrading.md` for project update and feature-enablement workflow
5. `vendor/tsnc/prisma-php/src` for installed core framework implementation details
6. `10-pulse-point.md` for PulsePoint-specific runtime behavior and reactive UI rules
7. Existing project code and structure

## Practical interpretation

Use these rules together:

- `prisma-php.json` tells you which capabilities are enabled.
- `upgrading.md` tells you how to update the project after changing feature flags or enabling capabilities.
- `vendor/tsnc/prisma-php/src` tells you how the installed core package is actually structured and implemented.
- `10-pulse-point.md` tells you how PulsePoint runtime code should be written.
- existing app code in `src/` shows local project patterns and conventions.

When these sources disagree, prefer the installed project-specific sources over generic assumptions.

<!-- END:prisma-php-agent-rules -->
