import { promises as fs } from "fs";
import path from "path";
import { Engine } from "php-parser";
import { getFileMeta } from "./utils";

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
export const SRC_DIR = path.join(PROJECT_ROOT, "src");
const IMPORTS_FILE = path.join(PROJECT_ROOT, "settings/class-imports.json");
const CLASS_LOG_FILE = path.join(PROJECT_ROOT, "settings/class-log.json");

async function saveImportsData(
  data: Record<
    string,
    Array<{ className: string; filePath: string; importer: string }>
  >
) {
  await fs.writeFile(IMPORTS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function loadClassLogData(): Promise<Record<string, any>> {
  try {
    const content = await fs.readFile(CLASS_LOG_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function getAllPhpFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllPhpFiles(fullPath)));
    } else if (entry.isFile() && fullPath.endsWith(".php")) {
      files.push(fullPath);
    }
  }
  return files;
}

function combineNamespaces(
  baseNamespace: string,
  subNamespace: string
): string {
  return (
    baseNamespace.replace(/\\$/, "") + "\\" + subNamespace.replace(/^\\/, "")
  );
}

export async function analyzeImportsInFile(
  filePath: string
): Promise<Record<string, string>> {
  const code = await fs.readFile(filePath, "utf-8");

  try {
    const ast = parser.parseCode(code, filePath);
    const imports: Record<string, string> = {};

    function traverse(node: any, baseNamespace = "") {
      if (!node || typeof node !== "object") return;

      if (Array.isArray(node)) {
        node.forEach((childNode) => traverse(childNode, baseNamespace));
      } else {
        if (node.kind === "usegroup" && node.name) {
          baseNamespace = node.name.name || node.name;
          for (const useItem of node.items || []) {
            if (useItem.kind === "useitem" && useItem.name) {
              const subNamespace = useItem.name.name || useItem.name;
              const fqn = combineNamespaces(baseNamespace, subNamespace);
              const alias = useItem.alias ? useItem.alias.name : subNamespace;
              if (!imports[alias]) {
                imports[alias] = fqn;
              }
            }
          }
        }

        if (node.kind === "useitem" && node.name) {
          const fqn = node.name.name || node.name;
          const alias = node.alias
            ? node.alias.name
            : path.basename(fqn.replace(/\\/g, "/"));
          if (!imports[alias]) {
            imports[alias] = fqn;
          }
        }

        for (const key in node) {
          traverse(node[key], baseNamespace);
        }
      }
    }

    traverse(ast);
    return imports;
  } catch (error) {
    console.error(`Error parsing file: ${filePath}`, error);
    return {};
  }
}

export async function updateComponentImports() {
  const phpFiles = await getAllPhpFiles(SRC_DIR);
  const allImports: Record<
    string,
    Array<{ fqn: string; importer: string }>
  > = {};

  for (const file of phpFiles) {
    const fileImports = await analyzeImportsInFile(file);
    for (const [alias, fqn] of Object.entries(fileImports)) {
      if (allImports[alias]) {
        if (
          !allImports[alias].some(
            (entry) => entry.fqn === fqn && entry.importer === file
          )
        ) {
          allImports[alias].push({ fqn, importer: file });
        }
      } else {
        allImports[alias] = [{ fqn, importer: file }];
      }
    }
  }

  const classLog = await loadClassLogData();
  const filteredImports: Record<
    string,
    Array<{ className: string; filePath: string; importer: string }>
  > = {};

  for (const [alias, entries] of Object.entries(allImports)) {
    for (const entry of entries) {
      if (classLog[entry.fqn]) {
        const importEntry = {
          className: entry.fqn,
          filePath: classLog[entry.fqn].filePath,
          importer: entry.importer,
        };
        if (filteredImports[alias]) {
          filteredImports[alias].push(importEntry);
        } else {
          filteredImports[alias] = [importEntry];
        }
      }
    }
  }

  await saveImportsData(filteredImports);
}
