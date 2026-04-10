# Prisma PHP

Prisma PHP is a modern full-stack PHP framework that combines native PHP, PulsePoint reactivity, PHPX components, and a Prisma-inspired ORM into one cohesive developer experience.

Build reactive interfaces with a server-first mental model, structured routing, type-safe data access, and a project layout designed for real applications.

## Getting Started

Create a new Prisma PHP project:

```bash
npx create-prisma-php-app@latest my-app
```

Start the development server:

```bash
npm run dev
```

Open the local app in your browser after the dev server starts.

## Prerequisites

Before creating a Prisma PHP project, make sure you have:

- Node.js 22.x or higher
- PHP 8.2 or higher
- Composer 2.x or higher
- XAMPP or another local PHP environment

If you are using XAMPP on Windows, enabling `extension=zip` in `php.ini` is recommended so Composer dependencies install correctly.

## What Prisma PHP Includes

Prisma PHP brings together the core pieces needed to build full-stack PHP apps:

- **Native PHP + modern reactivity** with PulsePoint
- **PHPX component system** for reusable UI composition
- **Prisma PHP ORM** for schema-first, type-safe database access
- **Built-in authentication patterns** for sessions, route protection, RBAC, credentials auth, and provider login
- **File-based routing** with clear route file conventions
- **CLI scaffolding** for new apps, starter kits, and optional features
- **Flexible deployment options** for local development and production workflows

## Common Create Commands

Create a default full-stack app:

```bash
npx create-prisma-php-app@latest my-app
```

Create a project with common options:

```bash
npx create-prisma-php-app@latest my-app --tailwindcss --typescript
```

Use a starter kit:

```bash
npx create-prisma-php-app my-app --starter-kit=fullstack
```

Other documented flags may include capabilities such as WebSocket support, MCP support, backend-only mode, Swagger docs, and Prisma integration depending on the installed version.

## Documentation

Prisma PHP ships with local documentation for the installed project version.

The installed docs live here:

```txt
node_modules/prisma-php/dist/docs
```

Treat these installed docs as the primary documentation source for the current project version.

You can also explore the public docs site:

```txt
https://prismaphp.tsnc.tech/
```

## AI Quick Start

If you are using AI-assisted development in a Prisma PHP project:

1. Read `./prisma-php.json` first.
2. Read the installed docs in `node_modules/prisma-php/dist/docs`.
3. Read `AGENTS.md` for task-routing rules, framework constraints, and code-generation guidance.
4. Inspect `vendor/tsnc/prisma-php/src` only when the docs do not answer the task.

### Default interactive UI rule

In Prisma PHP, AI should treat **PulsePoint as the default frontend interactivity model**.

For normal full-stack page work:

- render the page with `index.php`
- manage browser-side state and UI behavior with **PulsePoint**
- call PHP from the frontend with **`pp.fetchFunction(...)`**
- expose callable PHP functions with **`#[Exposed]`**
- validate incoming data on the PHP side with **`PP\Validator`**

Do **not** default to PHP-only refresh cycles, handcrafted `fetch('/api/...')` patterns, or extra `route.php` handlers for normal interactive page behavior when PulsePoint plus `pp.fetchFunction(...)` already fits the task.

Only prefer a more PHP-only interaction style when the **user explicitly asks for PHP-only behavior**, or when the task is clearly non-reactive.

## Project Capability Manifest

Prisma PHP uses `prisma-php.json` at the repository root as the source of truth for enabled framework features and local environment configuration.

Use it to verify capabilities such as:

- Tailwind CSS support
- backend-only mode
- Prisma ORM support
- Swagger docs
- WebSocket support
- MCP support
- TypeScript support
- local development paths and BrowserSync settings

Do not assume a feature is enabled unless `prisma-php.json` confirms it.

## Documentation Map

Use these docs as the main entry points for common work:

- `index.md` for the general documentation entry point
- `project-structure.md` for project structure, route placement, and file conventions
- `layouts-and-pages.md` for pages, layouts, nested routes, and dynamic routes
- `components.md` for PHPX components, props, children, fragments, icons, buttons, and composition
- `fetching-data.md` for `pp.fetchFunction(...)`, `#[Exposed]`, and interactive backend flows
- `prisma-php-orm.md` for Prisma ORM, `schema.prisma`, migrations, and generated PHP classes
- `authentication.md` for auth strategy, sessions, RBAC, credentials auth, and provider flows
- `file-manager.md` for uploads, `multipart/form-data`, `$_FILES`, and `PP\FileManager\UploadFile`
- `route-handlers.md` for `route.php`, JSON responses, and direct server handlers
- `error-handling.md` for expected errors, `error.php`, `not-found.php`, and validation failures
- `caching.md` for cache behavior and `CacheHandler`
- `metadata-and-og-images.md` for metadata, title, description, icons, and head behavior
- `pulsepoint.md` for PulsePoint runtime usage and reactivity patterns
- `upgrading.md` for feature enablement and project update workflows

## Recommended Development Approach

When working in Prisma PHP:

- prefer the installed Prisma PHP docs over assumptions from other frameworks
- use `AGENTS.md` as the strict AI operating guide
- inspect nearby project files before generating new framework-specific code
- inspect framework internals only when the installed docs are not enough

## Route and File Conventions

Prisma PHP uses file-based routing with special route files such as:

- `index.php` for rendered UI routes
- `layout.php` for shared UI wrappers
- `route.php` for direct handlers such as JSON or API-style endpoints
- `loading.php` for loading UI
- `not-found.php` for route-level not-found UI
- `error.php` for route-level or app-level error UI

For task-specific route decision rules and framework generation rules, read `AGENTS.md`.

## PulsePoint and Frontend Reactivity

Prisma PHP uses PulsePoint for browser-side reactivity, and AI should assume this is the **default choice** for interactive UI behavior in full-stack routes.

When working with runtime features such as:

- `pp.state`
- `pp.effect`
- `pp.ref`
- `pp-for`
- `pp-spread`
- `pp-ref`

read the installed Prisma PHP docs for the current version first, then consult:

```txt
https://pulsepoint.tsnc.tech/llms
```

## Project Structure

A generated Prisma PHP project typically includes folders like these:

```text
prisma-php-project/
├── prisma/            # schema, migrations, seed files
├── public/            # public entry point and assets
├── settings/          # project configuration
├── src/               # application source code
├── package.json       # frontend/dev scripts
├── composer.json      # PHP dependencies
└── prisma-php.json    # Prisma PHP project capability manifest
```

## Updating Existing Projects

When enabling features or syncing framework-managed project files:

1. Update `prisma-php.json` first.
2. Read `upgrading.md` in the installed docs.
3. Run the documented project update workflow for the current version.

## Learn More

Start with the installed docs for the current project version, use the topic-specific markdown guides for focused work, and rely on `AGENTS.md` when strict AI generation rules are needed.
