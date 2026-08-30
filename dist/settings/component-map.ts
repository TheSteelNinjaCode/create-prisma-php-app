import { promises as fs } from "fs";
import path from "path";
import { Engine } from "php-parser";
import { getFileMeta } from "./utils.js";

const { __dirname } = getFileMeta();

const parser = new Engine({
  parser: {
    php8: true,
    suppressErrors: true,
  },
  ast: {
    withPositions: false,
  },
});

const PROJECT_ROOT = path.join(__dirname, "..");
const CONFIG_FILE = path.join(PROJECT_ROOT, "prisma-php.json");
const COMPONENT_MAP_FILE = path.join(
  PROJECT_ROOT,
  "settings/component-map.json",
);

export const SRC_DIR = path.join(PROJECT_ROOT, "src");

const PHPX_BASE_CLASS = "PHPX";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ComponentMapProp {
  name: string;
  type: string;
  hasDefault: boolean;
  defaultValue: JsonValue | string;
}

export interface ComponentMapEntry {
  componentName: string;
  tagName: string;
  filePath: string;
  relativePath: string;
  importRoute: string;
  extendsPHPX: boolean;
  acceptsArbitraryProps: boolean;
  props: ComponentMapProp[];
}

interface PrismaPhpConfig {
  projectRootPath?: string;
  excludeFiles?: string[];
  componentScanDirs?: string[];
}

type DiscoveredComponent = ComponentMapEntry;

async function loadConfig(): Promise<PrismaPhpConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as PrismaPhpConfig;
  } catch {
    return {};
  }
}

function resolveProjectRoot(config: PrismaPhpConfig): string {
  if (config.projectRootPath && path.isAbsolute(config.projectRootPath)) {
    return config.projectRootPath;
  }

  return PROJECT_ROOT;
}

function resolveScanRoots(
  config: PrismaPhpConfig,
  projectRoot: string,
): string[] {
  const scanDirs =
    Array.isArray(config.componentScanDirs) &&
    config.componentScanDirs.length > 0
      ? config.componentScanDirs
      : ["src"];

  return scanDirs.map((dirPath) =>
    path.isAbsolute(dirPath) ? dirPath : path.join(projectRoot, dirPath),
  );
}

function normalizePathKey(filePath: string): string {
  return path.normalize(filePath).toLowerCase();
}

function toAbsoluteComponentPath(filePath: string): string {
  return path.normalize(filePath);
}

function toProjectRelativePath(filePath: string, projectRoot: string): string {
  return path.relative(projectRoot, filePath).replace(/\\/g, "/");
}

async function saveJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

export function componentNameToTagName(componentName: string): string {
  const kebabName = componentName
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[_.\s]+/g, "-")
    .toLowerCase();

  return `x-${kebabName}`;
}

export async function getAllPhpFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await getAllPhpFiles(fullPath)));
      } else if (entry.isFile() && fullPath.toLowerCase().endsWith(".php")) {
        files.push(fullPath);
      }
    }
  } catch {
    return files;
  }

  return files;
}

function nameToString(node: any): string {
  if (!node) {
    return "";
  }

  if (typeof node === "string") {
    return node;
  }

  if (typeof node.raw === "string" && node.raw.trim() !== "") {
    return node.raw;
  }

  if (typeof node.name === "string") {
    return node.name;
  }

  if (Array.isArray(node.name)) {
    return node.name
      .map((part: any) =>
        typeof part === "string" ? part : (part?.name ?? ""),
      )
      .filter(Boolean)
      .join("\\");
  }

  if (Array.isArray(node.items)) {
    return node.items.map(nameToString).filter(Boolean).join("|");
  }

  return String(node.name ?? "");
}

function typeToString(typeNode: any, nullable = false): string {
  if (!typeNode) {
    return "mixed";
  }

  let rawType = "";

  if (typeof typeNode.raw === "string" && typeNode.raw.trim() !== "") {
    rawType = typeNode.raw.replace(/\s+/g, "");
  } else if (Array.isArray(typeNode.types)) {
    rawType = typeNode.types.map((item: any) => typeToString(item)).join("|");
  } else {
    rawType = nameToString(typeNode).replace(/\s+/g, "");
  }

  if (
    nullable &&
    rawType !== "mixed" &&
    !rawType.startsWith("?") &&
    !rawType.split("|").includes("null")
  ) {
    return `?${rawType}`;
  }

  return rawType || "mixed";
}

function astValueToJson(valueNode: any): JsonValue | string {
  if (!valueNode || typeof valueNode !== "object") {
    return null;
  }

  switch (valueNode.kind) {
    case "string":
      return valueNode.value ?? "";
    case "number":
      return Number(valueNode.value ?? valueNode.raw ?? 0);
    case "boolean":
      return Boolean(valueNode.value);
    case "nullkeyword":
      return null;
    case "array": {
      const items = Array.isArray(valueNode.items) ? valueNode.items : [];
      const hasNamedKeys = items.some((item: any) => item?.key);

      if (!hasNamedKeys) {
        return items.map((item: any) => astValueToJson(item?.value ?? item));
      }

      const mapped: Record<string, JsonValue | string> = {};

      for (const item of items) {
        const key = item?.key ? String(astValueToJson(item.key)) : "";
        mapped[key] = astValueToJson(item?.value);
      }

      return mapped;
    }
    case "unary": {
      const inner = astValueToJson(valueNode.what);

      if (typeof inner === "number") {
        return valueNode.type === "-" ? -inner : inner;
      }

      return typeof valueNode.raw === "string" ? valueNode.raw : String(inner);
    }
    case "constref": {
      const constantName = nameToString(valueNode.name).toLowerCase();

      if (constantName === "true") {
        return true;
      }

      if (constantName === "false") {
        return false;
      }

      if (constantName === "null") {
        return null;
      }

      return nameToString(valueNode.name);
    }
    default:
      if (typeof valueNode.raw === "string" && valueNode.raw.trim() !== "") {
        return valueNode.raw;
      }

      return nameToString(valueNode);
  }
}

function extractComponentProps(classNode: any): ComponentMapProp[] {
  const props: ComponentMapProp[] = [];

  for (const statement of classNode.body ?? []) {
    if (
      !statement ||
      statement.kind !== "propertystatement" ||
      statement.visibility !== "public" ||
      statement.isStatic
    ) {
      continue;
    }

    for (const property of statement.properties ?? []) {
      props.push({
        name: nameToString(property.name),
        type: typeToString(property.type, Boolean(property.nullable)),
        hasDefault: property.value !== undefined && property.value !== null,
        defaultValue:
          property.value !== undefined && property.value !== null
            ? astValueToJson(property.value)
            : null,
      });
    }
  }

  return props;
}

function classExtendsPHPX(classNode: any): boolean {
  if (!classNode?.extends) {
    return false;
  }

  const name = nameToString(classNode.extends);
  return name.split("\\").pop() === PHPX_BASE_CLASS;
}

export async function analyzeComponentsInFile(
  filePath: string,
  projectRoot: string,
): Promise<DiscoveredComponent[]> {
  const code = await fs.readFile(filePath, "utf-8");

  try {
    const ast = parser.parseCode(code, filePath);
    const components: DiscoveredComponent[] = [];

    function traverse(node: any, currentNamespace = "") {
      if (Array.isArray(node)) {
        node.forEach((childNode) => traverse(childNode, currentNamespace));
        return;
      }

      if (!node || typeof node !== "object") {
        return;
      }

      if (node.kind === "namespace") {
        const nextNamespace = nameToString(node.name).replace(/^\\+/, "");

        for (const [key, value] of Object.entries(node)) {
          if (key === "kind" || key === "name") {
            continue;
          }

          traverse(value, nextNamespace || currentNamespace);
        }

        return;
      }

      if (node.kind === "class" && node.name?.name) {
        const extendsPHPX = classExtendsPHPX(node);

        if (extendsPHPX) {
          const componentName = node.name.name as string;
          const importRoute =
            (currentNamespace ? `${currentNamespace}\\` : "") + componentName;

          components.push({
            componentName,
            tagName: componentNameToTagName(componentName),
            filePath: toAbsoluteComponentPath(filePath),
            relativePath: toProjectRelativePath(filePath, projectRoot),
            importRoute,
            extendsPHPX,
            acceptsArbitraryProps: extendsPHPX,
            props: extractComponentProps(node),
          });
        }
      }

      for (const [key, value] of Object.entries(node)) {
        if (key === "kind" || key === "name") {
          continue;
        }

        traverse(value, currentNamespace);
      }
    }

    traverse(ast);
    return components;
  } catch (error) {
    console.error(`Error parsing component file: ${filePath}`, error);
    return [];
  }
}

function sortComponentMap(
  componentMap: DiscoveredComponent[],
): DiscoveredComponent[] {
  return [...componentMap].sort((left, right) => {
    const nameComparison = left.componentName.localeCompare(
      right.componentName,
    );

    if (nameComparison !== 0) {
      return nameComparison;
    }

    return left.relativePath.localeCompare(right.relativePath);
  });
}

export function buildRuntimeComponentLookup(
  componentMap: ComponentMapEntry[],
): Record<
  string,
  Array<{
    tagName: string;
    componentName: string;
    className: string;
    filePath: string;
  }>
> {
  const lookup: Record<
    string,
    Array<{
      tagName: string;
      componentName: string;
      className: string;
      filePath: string;
    }>
  > = {};

  for (const entry of componentMap) {
    const tagName = entry.tagName.toLowerCase();

    if (!lookup[tagName]) {
      lookup[tagName] = [];
    }

    lookup[tagName].push({
      tagName,
      componentName: entry.componentName,
      className: entry.importRoute,
      filePath: entry.filePath,
    });
  }

  return Object.fromEntries(
    Object.entries(lookup).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export async function updateComponentMap(): Promise<ComponentMapEntry[]> {
  const config = await loadConfig();
  const projectRoot = resolveProjectRoot(config);
  const scanRoots = resolveScanRoots(config, projectRoot);
  const excludedFiles = new Set(
    (config.excludeFiles ?? []).map((filePath) =>
      normalizePathKey(
        path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath),
      ),
    ),
  );

  const phpFiles: string[] = [];

  for (const scanRoot of scanRoots) {
    const discoveredFiles = await getAllPhpFiles(scanRoot);

    for (const filePath of discoveredFiles) {
      if (!excludedFiles.has(normalizePathKey(filePath))) {
        phpFiles.push(filePath);
      }
    }
  }

  const uniquePhpFiles = [
    ...new Set(phpFiles.map((filePath) => path.normalize(filePath))),
  ];
  const discoveredComponents: DiscoveredComponent[] = [];

  for (const filePath of uniquePhpFiles) {
    discoveredComponents.push(
      ...(await analyzeComponentsInFile(filePath, projectRoot)),
    );
  }

  const sortedComponents = sortComponentMap(discoveredComponents);
  const componentMap: ComponentMapEntry[] = [...sortedComponents];
  await saveJsonFile(COMPONENT_MAP_FILE, componentMap);

  return componentMap;
}
