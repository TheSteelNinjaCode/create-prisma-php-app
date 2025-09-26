<?php

/**
 * @const string SETTINGS_PATH
 * Absolute path to the `./settings` directory (the directory containing this file).
 * Example: /var/www/project/settings
 */
define('SETTINGS_PATH', dirname(__FILE__));

/**
 * @const string PRISMA_LIB_PATH
 * Absolute path to the Prisma library directory: `./src/Lib/Prisma`.
 * Example: /var/www/project/src/Lib/Prisma
 */
define('PRISMA_LIB_PATH', dirname(SETTINGS_PATH) . '/src/Lib/Prisma');

/**
 * @const string SRC_PATH
 * Absolute path to the application source directory: `./src`.
 * Example: /var/www/project/src
 */
define('SRC_PATH', dirname(SETTINGS_PATH) . '/src');

/**
 * @const string APP_PATH
 * Absolute path to the app entry directory: `./src/app`.
 * Example: /var/www/project/src/app
 */
define('APP_PATH', dirname(SETTINGS_PATH) . '/src/app');

/**
 * @const string LIB_PATH
 * Absolute path to the shared library directory: `./src/Lib`.
 * Example: /var/www/project/src/Lib
 */
define('LIB_PATH', dirname(SETTINGS_PATH) . '/src/Lib');

/**
 * @const string DOCUMENT_PATH
 * Absolute path to the project root directory: `./`.
 * Example: /var/www/project
 */
define('DOCUMENT_PATH', dirname(SETTINGS_PATH));

/**
 * @const string PUBLIC_PATH
 * Absolute path to the public web root directory: `./public`.
 * Example: /var/www/project/public
 */
define('PUBLIC_PATH', dirname(SETTINGS_PATH) . '/public');
