<?php

namespace Lib;

class PrismaPHPSettings
{
    /**
     * The settings from the prisma-php.json file.
     * 
     * @var \stdClass
     * @access public
     * @static
     */
    public static \ArrayObject $option;

    /**
     * The list of route files from the files-list.json file.
     * 
     * @var array
     * @access public
     * @static
     */
    public static array $routeFiles = [];

    public static function init(): void
    {
        self::$option = self::getPrismaSettings();
        self::$routeFiles = self::getRoutesFileList();
    }

    private static function getPrismaSettings(): \ArrayObject
    {
        $prismaPHPSettingsJson = DOCUMENT_PATH . '/prisma-php.json';

        if (file_exists($prismaPHPSettingsJson)) {
            $jsonContent = file_get_contents($prismaPHPSettingsJson);
            $decodedJson = json_decode($jsonContent, true);

            if (json_last_error() === JSON_ERROR_NONE) {
                return new \ArrayObject($decodedJson, \ArrayObject::ARRAY_AS_PROPS);
            } else {
                return new \ArrayObject([], \ArrayObject::ARRAY_AS_PROPS);
            }
        }
    }

    private static function getRoutesFileList(): array
    {
        $jsonFileName = SETTINGS_PATH . '/files-list.json';
        $routeFiles = file_exists($jsonFileName) ? json_decode(file_get_contents($jsonFileName), true) : [];

        return $routeFiles;
    }
}
