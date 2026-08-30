import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import prismaPhpConfigJson from "../prisma-php.json";
import { getFileMeta } from "./utils.js";

const { __dirname } = getFileMeta();
const projectRoot = join(__dirname, "..");

// The PHP binary the project is configured for (prisma-php.json), falling
// back to whatever `php` resolves to on PATH.
const phpExe =
  prismaPhpConfigJson.phpRootPathExe && existsSync(prismaPhpConfigJson.phpRootPathExe)
    ? prismaPhpConfigJson.phpRootPathExe
    : "php";

const phpunit = join(projectRoot, "vendor", "phpunit", "phpunit", "phpunit");

if (!existsSync(phpunit)) {
  console.error(
    "PHPUnit is not installed. Run: composer install (phpunit/phpunit is a dev dependency).",
  );
  process.exit(1);
}

// Everything after `npm run test --` is handed to PHPUnit, so
// `npm run test -- --filter CsrfTest` narrows the run.
const args = [phpunit, "--configuration", join(projectRoot, "phpunit.xml"), ...process.argv.slice(2)];

const result = spawnSync(phpExe, args, {
  cwd: projectRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
