import { promises as fs } from "fs";
import path from "path";
import { Engine } from "php-parser";
import { getFileMeta } from "./utils.js";

const { __dirname } = getFileMeta();

const CONFIG_FILE = path.join(__dirname, "..", "prisma-php.json");
const LOG_FILE = path.join(__dirname, "class-log.json");

const SRC_DIR = path.join(__dirname, "..", "src");

const IPHPX_INTERFACE = "IPHPX";
const PHPX_BASE_CLASS = "PHPX";

type LogMap = Record<
  string,
  {
    filePath: string;
    baseDir?: string;
  }
>;

interface PrismaPhpConfig {
  projectRootPath?: string;
  excludeFiles?: string[];
  componentScanDirs?: string[];
}

const parser = new Engine({
  parser: { php8: true, suppressErrors: true },
  ast: { withPositions: false },
});

async function loadConfig(): Promise<PrismaPhpConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as PrismaPhpConfig;
  } catch {
    return {};
  }
}

function resolveProjectRoot(cfg: PrismaPhpConfig): string {
  if (cfg.projectRootPath && path.isAbsolute(cfg.projectRootPath)) {
    return cfg.projectRootPath;
  }
  return path.join(__dirname, "..");
}

function resolveScanRoots(cfg: PrismaPhpConfig, projectRoot: string): string[] {
  const dirs =
    Array.isArray(cfg.componentScanDirs) && cfg.componentScanDirs.length
      ? cfg.componentScanDirs
      : ["src"];

  return dirs.map((d) => (path.isAbsolute(d) ? d : path.join(projectRoot, d)));
}

function relativeFromSrc(absPath: string): string {
  const rel = path.relative(SRC_DIR, absPath);
  return rel.replace(/\\/g, "\\");
}

function normalizeForWinBackslashes(p: string): string {
  return p.replace(/\\/g, "\\");
}

function pickRootForFile(scanRoots: string[], absPath: string): string {
  for (const root of scanRoots) {
    const rel = path.relative(root, absPath);
    if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
      return root;
    }
  }
  return scanRoots[0] ?? path.dirname(absPath);
}

async function saveLogData(logData: LogMap) {
  await fs.writeFile(LOG_FILE, JSON.stringify(logData, null, 2));
}

function nameToString(n: any): string {
  if (!n) return "";
  if (typeof n === "string") return n;
  if (typeof n.name === "string") return n.name;
  if (Array.isArray(n.name)) {
    return n.name
      .map((p: any) => (typeof p === "string" ? p : p?.name ?? ""))
      .filter(Boolean)
      .join("\\");
  }
  if (n.kind === "name" && typeof n.name === "string") return n.name;
  return String(n.name ?? "");
}

function namespaceNodeToString(nsNode: any): string {
  if (!nsNode) return "";
  const s = nameToString(nsNode);
  return s.replace(/^\s+|\s+$/g, "");
}

async function analyzePhpFile(filePath: string) {
  const code = await fs.readFile(filePath, "utf-8");

  try {
    const ast = parser.parseCode(code, filePath);

    type Found = {
      fqcn: string;
      name: string;
      implementsIPHPX: boolean;
      extendsPHPX: boolean;
    };
    const classesFound: Found[] = [];

    function traverse(node: any, currentNs: string) {
      if (Array.isArray(node)) {
        node.forEach((n) => traverse(n, currentNs));
        return;
      }
      if (!node || typeof node !== "object") return;

      if (node.kind === "namespace") {
        const nsName = namespaceNodeToString(node.name ?? node);
        const nextNs = nsName || "";
        for (const key in node) {
          if (key === "kind" || key === "name") continue;
          traverse(node[key], nextNs);
        }
        return;
      }

      if (node.kind === "class" && node.name?.name) {
        const className = node.name.name as string;

        let implementsIPHPX = false;
        if (Array.isArray(node.implements)) {
          implementsIPHPX = node.implements.some((iface: any) => {
            const nm = nameToString(iface);
            const leaf = nm.split("\\").pop()!;
            return leaf === IPHPX_INTERFACE;
          });
        }

        let extendsPHPX = false;
        if (node.extends) {
          const nm = nameToString(node.extends);
          const leaf = nm.split("\\").pop()!;
          extendsPHPX = leaf === PHPX_BASE_CLASS;
        }

        const fqcn = (currentNs ? currentNs + "\\" : "") + className;
        classesFound.push({
          fqcn,
          name: className,
          implementsIPHPX,
          extendsPHPX,
        });
      }

      for (const key in node) {
        if (key === "name" || key === "kind") continue;
        if (node[key]) traverse(node[key], currentNs);
      }
    }

    traverse(ast, "");
    return classesFound;
  } catch (error) {
    console.error(`Error parsing file: ${filePath}`, error);
    return [];
  }
}

async function updateClassLogForFile(
  absFilePath: string,
  logData: LogMap,
  scanRoots: string[],
  projectRoot: string
) {
  const classes = await analyzePhpFile(absFilePath);
  const matchedRoot = pickRootForFile(scanRoots, absFilePath);
  const baseDirRelToProject = path
    .relative(projectRoot, matchedRoot)
    .replace(/\\/g, "/");

  for (const cls of classes) {
    if (cls.implementsIPHPX || cls.extendsPHPX) {
      const classFullName = cls.fqcn;

      const legacyRelPath = relativeFromSrc(absFilePath);

      logData[classFullName] = {
        filePath: normalizeForWinBackslashes(legacyRelPath),
        baseDir: baseDirRelToProject,
      };
    }
  }
}

async function getAllPhpFiles(dir: string): Promise<string[]> {
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
    // ignore missing/unreadable dirs to keep resilient
  }
  return files;
}

export async function updateAllClassLogs() {
  const cfg = await loadConfig();
  const projectRoot = resolveProjectRoot(cfg);
  const scanRoots = resolveScanRoots(cfg, projectRoot);

  const excludeAbs = new Set(
    (cfg.excludeFiles ?? []).map((p) =>
      path.isAbsolute(p) ? p : path.join(projectRoot, p)
    )
  );

  const allPhpFiles: string[] = [];
  for (const root of scanRoots) {
    const files = await getAllPhpFiles(root);
    for (const f of files) {
      if (!excludeAbs.has(f)) allPhpFiles.push(f);
    }
  }

  const logData: LogMap = {};

  for (const file of allPhpFiles) {
    await updateClassLogForFile(file, logData, scanRoots, projectRoot);
  }

  await saveLogData(logData);
  // console.log("class-log.json updated from configured componentScanDirs.");
}
