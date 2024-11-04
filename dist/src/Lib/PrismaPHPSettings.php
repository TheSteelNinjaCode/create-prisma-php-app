<?php

declare(strict_types=1);

namespace Lib;

class BSPathRewrite
{
    public string $pattern;
    public string $replacement;

    public function __construct(array $data)
    {
        $this->pattern = $data['pattern'] ?? '';
        $this->replacement = $data['replacement'] ?? '';
    }
}

class PrismaSettings
{
    public string $projectName;
    public string $projectRootPath;
    public string $phpEnvironment;
    public string $phpRootPathExe;
    public string $phpGenerateClassPath;
    public string $bsTarget;
    public BSPathRewrite $bsPathRewrite;
    public bool $backendOnly;
    public bool $swaggerDocs;
    public bool $tailwindcss;
    public bool $websocket;
    public bool $prisma;
    public bool $docker;
    public string $version;
    public array $excludeFiles;

    public function __construct(array $data)
    {
        $this->projectName = $data['projectName'] ?? '';
        $this->projectRootPath = $data['projectRootPath'] ?? '';
        $this->phpEnvironment = $data['phpEnvironment'] ?? '';
        $this->phpRootPathExe = $data['phpRootPathExe'] ?? '';
        $this->phpGenerateClassPath = $data['phpGenerateClassPath'] ?? '';
        $this->bsTarget = $data['bsTarget'] ?? '';
        $this->bsPathRewrite = new BSPathRewrite($data['bsPathRewrite'] ?? []);
        $this->backendOnly = $data['backendOnly'] ?? false;
        $this->swaggerDocs = $data['swaggerDocs'] ?? true;
        $this->tailwindcss = $data['tailwindcss'] ?? true;
        $this->websocket = $data['websocket'] ?? true;
        $this->prisma = $data['prisma'] ?? true;
        $this->docker = $data['docker'] ?? false;
        $this->version = $data['version'] ?? '';
        $this->excludeFiles = $data['excludeFiles'] ?? [];
    }
}

class PrismaPHPSettings
{
    /**
     * The settings from the prisma-php.json file.
     * 
     * @var PrismaSettings
     */
    public static PrismaSettings $option;

    /**
     * The list of route files from the files-list.json file.
     * 
     * @var array
     */
    public static array $routeFiles = [];

    public static function init(): void
    {
        self::$option = self::getPrismaSettings();
        self::$routeFiles = self::getRoutesFileList();
    }

    /**
     * Get Prisma settings from the JSON file.
     *
     * @return PrismaSettings
     * @throws Exception if the JSON file cannot be decoded.
     */
    private static function getPrismaSettings(): PrismaSettings
    {
        $prismaPHPSettingsJson = DOCUMENT_PATH . '/prisma-php.json';

        if (!file_exists($prismaPHPSettingsJson)) {
            throw new \Exception("Settings file not found: $prismaPHPSettingsJson");
        }

        $jsonContent = file_get_contents($prismaPHPSettingsJson);
        $decodedJson = json_decode($jsonContent, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception("Failed to decode JSON: " . json_last_error_msg());
        }

        return new PrismaSettings($decodedJson);
    }

    private static function getRoutesFileList(): array
    {
        $jsonFileName = SETTINGS_PATH . '/files-list.json';
        $routeFiles = file_exists($jsonFileName) ? json_decode(file_get_contents($jsonFileName), true) : [];

        return $routeFiles;
    }
}
