# Prisma PHP

Prisma PHP is a modern full-stack PHP framework that combines native PHP, PulsePoint reactivity, PHPX components, and a Prisma-inspired ORM into one cohesive developer experience.

Build modern, reactive interfaces with a server-first mental model, type-safe data access, and a project structure designed for real applications.

## Getting Started

First, create a new Prisma PHP project:

```bash
npx create-prisma-php-app@latest my-app
```

Start the development server:

```bash
npm run dev
```

Open your local app in the browser after the dev server starts.

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
- **PHPX component system** inspired by JSX and React
- **Prisma PHP ORM** for schema-first, type-safe database access
- **CLI scaffolding** for new apps, starter kits, and optional features
- **Flexible deployment options** for traditional hosting, CI/CD, and containerized setups

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

Other documented flags include:

- `--websocket`
- `--mcp`
- `--backend-only`
- `--swagger-docs`
- `--docker`

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

## Project Capability Manifest

Prisma PHP uses `prisma-php.json` at the repository root as the source of truth for enabled framework features and local environment configuration.

Tools, scripts, and AI agents should inspect this file before making decisions about:

- frontend tooling
- backend-only mode
- Prisma ORM usage
- Tailwind CSS availability
- Swagger docs
- Websocket support
- MCP support
- TypeScript support
- local development paths and BrowserSync config

A typical file looks like this:

```json
{
  "projectName": "test-latest",
  "projectRootPath": "C:\\xampp\\htdocs\\projects\\prisma-php\\test\\test-latest",
  "phpEnvironment": "XAMPP",
  "phpRootPathExe": "C:\\xampp\\php\\php.exe",
  "bsTarget": "http://localhost/projects/prisma-php/test/test-latest/",
  "bsPathRewrite": {
    "^/": "/projects/prisma-php/test/test-latest/"
  },
  "backendOnly": false,
  "swaggerDocs": false,
  "tailwindcss": true,
  "websocket": false,
  "mcp": false,
  "prisma": false,
  "typescript": false,
  "version": "4.4.9",
  "componentScanDirs": ["src", "vendor/tsnc/prisma-php/src"],
  "excludeFiles": []
}
```

## AI Agent Guidance

If you are using AI-assisted development in this project:

- treat `prisma-php.json` as the capability manifest for the current app
- do not assume Tailwind CSS, Prisma ORM, MCP, Swagger, TypeScript, or websocket support is enabled unless the file says so
- read the installed Prisma PHP docs for the current version before changing routing, layouts, middleware, or framework-specific behavior
- use `prisma-php.json` together with the installed docs to make safer decisions

## PHPX and Reactivity

Prisma PHP uses **PHPX**, a template system inspired by JSX and React, but designed for `.php` files. Combined with **PulsePoint**, it gives you interactive UI behavior without adopting a full JavaScript framework mental model.

You can keep your application logic in PHP while using browser-resident state for fast UI updates.

## ORM

Prisma PHP ORM is a schema-first database toolkit for PHP. You define your models in `schema.prisma`, generate a typed PHP client, and use expressive query methods such as:

- `findMany`
- `findFirst`
- `findUnique`
- `create`
- `update`
- `delete`
- `upsert`

It also includes CLI support for workflows like:

- `migrate`
- `generate`
- `push`
- `reset`

## Deployment

Prisma PHP supports multiple deployment styles:

- **Traditional deployment** using ZIP/FTP to shared hosting environments such as cPanel
- **CI/CD deployment** with GitHub Actions
- **Docker deployment** for containerized environments

A common production flow is:

```bash
npm run build
```

Then upload or deploy the built project using your preferred hosting workflow.

## Learn More

To learn more about Prisma PHP, explore the official resources:

- Website: [https://prismaphp.tsnc.tech](https://prismaphp.tsnc.tech)
- Documentation: [https://prismaphp.tsnc.tech/docs](https://prismaphp.tsnc.tech/docs)

## Ecosystem

Prisma PHP is part of a broader ecosystem that includes:

- PulsePoint
- PHPX UI
- PP Icons

## Notes

- For the best PHPX development experience in VS Code, install the **PHPX Tag Support** extension.
- If PowerShell blocks local scripts during `npm run dev`, check your Windows execution policy.
