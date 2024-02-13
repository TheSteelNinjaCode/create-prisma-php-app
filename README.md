# create prisma php app

Prisma-PHP: A Revolutionary Library Bridging PHP with Prisma ORM

## Introduction

`create-prisma-php-app` is an innovative command-line tool designed to seamlessly integrate PHP with Prisma ORM. This tool stands out by offering a unique combination of PHP's robust server-side capabilities with Prisma's modern ORM features. Whether you're building a small project or a large-scale application, `create-prisma-php-app` provides the tools and flexibility needed to elevate your development experience.

## Prerequisites

Ensure your system is equipped with:

- Node.js: Version 16.x or higher [Download Node.js](https://nodejs.org/en/download/)
- XAMPP: (or any PHP 7.4+ environment) [Download XAMPP](https://www.apachefriends.org/download.html)
- Composer: Version 2.x or higher [Download Composer](https://getcomposer.org/download/)

## Verifying Prerequisites

To verify your installations, run the following commands in your terminal:

- Node.js: `node -v`
- PHP: `php -v`
- Composer: `composer --version`

## Installation

Installation Steps:

1. Open your terminal.
2. Run the command:

- Create a new Prisma-PHP project: in the desired directory, run the command:

```bash
npx create-prisma-php-app@latest
```

- Install composer dependencies: in the project directory, run the command:

```bash
composer install
```

- Set your PHP_ROOT_PATH_EXE in `settings/project-settings.js` file

```javascript
PHP_ROOT_PATH_EXE: "D:\\xampp\\php\\php.exe", // Replace with your PHP path
```

## What's Included

### Prisma ORM and TypeScript Support

- `typescript`: For robust typing and scalability.
- `@types/node`: Essential Node.js type definitions.
  `ts-node`: To execute TypeScript scripts in a Node.js environment.

### PHP and Composer Dependencies

- `vlucas/phpdotenv`: Allows your project to load environment variables from a `.env` file, making configuration management easier and more secure.
- `ramsey/uuid`, `hidehalo/nanoid-php`: Provide robust solutions for generating unique identifiers in your application.
- `firebase/php-jwt`: Facilitates working with JSON Web Tokens (JWT) for secure authentication.

### Tailwind CSS Support (Optional)

- `tailwindcss`, `postcss`, `autoprefixer`: Enhance your front-end with Tailwind's utility-first CSS framework.

### browser-sync support (Optional)

- `browser-sync`: For live reloading and synchronized browser testing.

The package will include `browser-sync` for live reloading and synchronized browser testing. This feature is optional and can be removed if not needed.

## Usage

```bash
npm run dev
```

If you get an "Error" like this:

```bash
browser-sync : File C:\Users\Username\AppData\Roaming\npm\browser-sync.ps1 cannot be loaded because running scripts is disabled on this system. For more information, see about_Execution_Policies
at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:1 char:1
+ browser-sync start --proxy localhost:3000 --files "public/**/*"
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
```

### Solution

Run the following command in PowerShell as an administrator:

```bash
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
"OR"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## Prisma Command

| Command                     | Description                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `npx prisma init`           | Initializes a new Prisma project by creating the necessary configuration files.                   |
| `npx prisma migrate dev`    | Creates and applies database migrations in a development environment. Also updates Prisma schema. |
| `npx prisma migrate reset`  | Resets the database by dropping all data and applying all migrations from scratch.                |
| `npx prisma migrate deploy` | Applies pending migrations to the database, typically used in a production environment.           |
| `npx prisma db push`        | Pushes the Prisma schema state to the database without generating migration files.                |
| `npx prisma db pull`        | Updates the Prisma schema by introspecting the database.                                          |
| `npx prisma generate`       | Generates Prisma Client based on the current Prisma schema.                                       |
| `npx prisma studio`         | Opens Prisma Studio, a GUI to view and edit the data in your database.                            |
| `npx prisma format`         | Formats the Prisma schema file for better readability and consistency.                            |

## PHP Special Commands for Prisma

| Command                  | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `npx php generate class` | Generates PHP classes for the database schema. |

## Composer Command

| Command                     | Description                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `composer install`          | Installs all PHP dependencies listed in the `composer.json` file.                                                |
| `composer update`           | Updates all PHP dependencies to the latest versions listed in `composer.json`.                                   |
| `composer dump-autoload`    | Regenerates the list of all classes that need to be included in the project (autoload file).                     |
| `composer dump-autoload -o` | Optimizes the autoload by generating a more efficient class map, making it faster to load. Ideal for production. |

## Example Usage

Basic Query Example:

```php
<?php
require_once __DIR__ . '/../bootstrap.php';
use App\Classes\Prisma\Prisma;

$prisma = new Prisma();
print_r($prisma->User->findMany());
?>
```

This code fetches and displays all users from the `User` table.

## Project Structure

```bash
PrismaPHPProject
├── prisma                          # Prisma directory
│   ├── migrations                  # Database migration files
│   ├── schema.prisma               # Main Prisma schema file
│   └── seed.js                     # Database seeding script
├── public                          # Publicly accessible files
│   └── [...]
├── src                             # Source code
│   ├── app                         # Core application code
│   │   ├── api                     # API endpoints and logic
│   │   ├── assets                  # Static assets (images, fonts, etc.)
│   │   ├── css                     # CSS stylesheets
│   │   ├── js                      # JavaScript files
│   │   ├── favicon                 # Favicon files
│   │   ├── index.php               # Main application entry point
│   │   ├── layout.php              # Main application layout
│   │   ├── metadata.php            # Metadata for the application
│   │   ├── not-found.php           # 404 page
│   │   └── [...]                   # Other application files (/users, /dashboard, etc.)
│   ├── Lib                         # Utility functions and libraries
│   └── [...]
├── settings                        # Configuration files
│   ├── bs-config.cjs               # BrowserSync configuration
│   ├── paths.php                   # Path settings
│   └── project-settings.js         # Project settings **NOTE**: PHP_ROOT_PATH_EXE: "D:\\xampp\\php\\php.exe", Replace with your PHP path
├── vendor                          # Composer dependencies
├── bootstrap.php                   # Initialization script
├── .env                            # Environment variables
├── composer.json                   # Composer configuration
├── composer.lock                   # Composer lock file
├── postcss.config.js               # PostCSS configuration (Tailwind CSS)
├── tailwind.config.js              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
└── [...]
```

## Documentation and Resources

- [Node.js](https://nodejs.org/en/docs/)
- [XAMPP](https://www.apachefriends.org/documentation/)
- [Composer](https://getcomposer.org/doc/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PHP Documentation](https://www.php.net/manual/en/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## VSCODE Extensions

For a better development experience, consider installing the following Visual Studio Code extensions:

- [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma)
- [PHP Intelephense](https://marketplace.visualstudio.com/items?itemName=bmewburn.vscode-intelephense-client)
- [PHP Debug](https://marketplace.visualstudio.com/items?itemName=felixfbecker.php-debug)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## Video Tutorial

For a step-by-step guide on how to use `create-prisma-php-app`, watch the following video:

[Prisma-PHP: A Revolutionary Library Bridging PHP with Prisma ORM](https://www.youtube.com/playlist?list=PLS-62wu4j8sS0Ia7ZkWHQ41W85Ice85PA)

## Contributing

Contributions to `create-prisma-php-app` are welcome. If you have any suggestions, bug reports, or pull requests, feel free to open an issue or submit a pull request on the repository.

## License

`create-prisma-php-app` is under the MIT License. See LICENSE for details.

## Author

`create-prisma-php-app` is developed and maintained by [The Steel Ninja Code](https://thesteelninjacode.com/).

## Contact Us

For support, feedback, or inquiries, contact us at [thesteelninjacode@gmail.com](mailto:thesteelninjacode@gmail.com)
