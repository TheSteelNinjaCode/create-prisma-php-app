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

async function loadImportsData(): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(IMPORTS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveImportsData(
  data: Record<string, { className: string; filePath: string }>
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
    // Parse the PHP file to AST
    const ast = parser.parseCode(code, filePath);

    const imports: Record<string, string> = {};

    function traverse(node: any, baseNamespace = "") {
      if (!node || typeof node !== "object") return;

      if (Array.isArray(node)) {
        node.forEach((childNode) => traverse(childNode, baseNamespace));
      } else {
        // Handle grouped `use` statements
        if (node.kind === "usegroup" && node.name) {
          baseNamespace = node.name.name || node.name; // Set base namespace
          for (const useItem of node.items || []) {
            if (useItem.kind === "useitem" && useItem.name) {
              const subNamespace = useItem.name.name || useItem.name; // Sub-namespace
              const fqn = combineNamespaces(baseNamespace, subNamespace); // Fully Qualified Namespace
              const alias = useItem.alias ? useItem.alias.name : subNamespace; // Alias or default to subNamespace
              if (!imports[alias]) {
                // Prevent overwriting
                imports[alias] = fqn; // Map alias to FQN
                // console.log(`🚀 Adding import: ${alias} -> ${fqn}`);
              }
            }
          }
        }

        // Handle non-grouped `use` statements
        if (node.kind === "useitem" && node.name) {
          const fqn = node.name.name || node.name; // Fully Qualified Namespace
          const alias = node.alias
            ? node.alias.name
            : path.basename(fqn.replace(/\\/g, "/"));
          if (!imports[alias]) {
            // Prevent overwriting
            imports[alias] = fqn;
          }
        }

        // Traverse child nodes
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
  // Load existing imports (if any)
  const allImports = await loadImportsData();

  // Analyze all PHP files for use statements
  const phpFiles = await getAllPhpFiles(SRC_DIR);
  for (const file of phpFiles) {
    const fileImports = await analyzeImportsInFile(file);
    // Merge fileImports into allImports
    Object.assign(allImports, fileImports);
  }

  // Now filter using class-log.json
  const classLog = await loadClassLogData();

  const filteredImports: Record<
    string,
    { className: string; filePath: string }
  > = {};
  for (const [alias, fqn] of Object.entries(allImports)) {
    if (classLog[fqn]) {
      // console.log(`Including: ${alias} -> ${fqn}`);
      filteredImports[alias] = {
        className: fqn,
        filePath: classLog[fqn].filePath,
      };
    } else {
      // console.log(`Excluding: ${alias} -> ${fqn}`);
    }
  }

  await saveImportsData(filteredImports);
  // console.log(
  //   "component_imports.json updated with IPHPX/PHPX components only."
  // );
}
