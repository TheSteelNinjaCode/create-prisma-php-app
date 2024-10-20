<?php

namespace Lib;

class PrismaPHPSettings
{
    /**
     * 
     */
    public static \ArrayObject $option;

    public static array $routeFiles;

    public static function init(): void
    {
        self::$option = self::getPrismaSettings();
        self::$routeFiles = self::getRouteFileList();
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
                return new \ArrayObject([]);
            }
        }
    }

    private static function getRouteFileList(): array
    {
        $jsonFileName = SETTINGS_PATH . '/files-list.json';
        $routeFiles = file_exists($jsonFileName) ? json_decode(file_get_contents($jsonFileName), true) : [];

        return $routeFiles;
    }
}
