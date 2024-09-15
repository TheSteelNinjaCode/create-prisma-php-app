<?php

/**
 * @var string SETTINGS_PATH - The absolute path to the settings directory
 */
define("SETTINGS_PATH", dirname(__FILE__));
/**
 * @var string PUBLIC_PATH - The absolute path to the public directory
 */
define("PUBLIC_PATH", dirname(SETTINGS_PATH) . "/public");
/**
 * @var string PRISMA_LIB_PATH - The absolute path to the Prisma library directory
 */
define("PRISMA_LIB_PATH", dirname(SETTINGS_PATH) . "/src/Lib/Prisma");
/**
 * @var string SRC_PATH - The absolute path to the src directory
 */
define("SRC_PATH", dirname(SETTINGS_PATH) . "/src");
/**
 * @var string APP_PATH - The absolute path to the app directory
 */
define("APP_PATH", dirname(SETTINGS_PATH) . "/src/app");
/**
 * @var string LIB_PATH - The absolute path to the layout directory
 */
define("LIB_PATH", dirname(SETTINGS_PATH) . "/src/Lib");
/**
 * @var string DOCUMENT_PATH - The absolute path to the layout directory
 */
define("DOCUMENT_PATH", dirname(SETTINGS_PATH));
