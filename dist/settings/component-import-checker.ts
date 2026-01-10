import { promises as fs } from "fs";
import chalk from "chalk";

function removeAllHeredocs(code: string): string {
  const heredocRegex =
    /<<<\s*['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?\s*\n[\s\S]*?\n[ \t]*\1;?/g;
  return code.replace(heredocRegex, "");
}

function removePhpComments(code: string): string {
  code = code.replace(/\/\*[\s\S]*?\*\//g, "");
  code = code.replace(/\/\/.*$/gm, "");
  return code;
}

function removePhpStrings(code: string): string {
<<<<<<< HEAD
  // Remove single quoted strings
  code = code.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  // Remove double quoted strings
=======
  code = code.replace(/'(?:[^'\\]|\\.)*'/g, "''");
>>>>>>> v4-dev
  code = code.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  return code;
}

function findComponentsInFile(code: string): string[] {
  let cleanedCode = removePhpComments(removeAllHeredocs(code));
<<<<<<< HEAD
  // Remove PHP strings to avoid matching components in string literals
  cleanedCode = removePhpStrings(cleanedCode);

  // Match components that are clearly in template context (naked, clean)
=======
  cleanedCode = removePhpStrings(cleanedCode);

>>>>>>> v4-dev
  const componentRegex = /<([A-Z][A-Za-z0-9]*)\s*(?:\s+[^>]*)?\/?>(?!['"])/g;
  const components = new Set<string>();
  let match;

  while ((match = componentRegex.exec(cleanedCode)) !== null) {
    components.add(match[1]);
  }

  return Array.from(components);
}

export async function checkComponentImports(
  filePath: string,
  fileImports: Record<
    string,
    | Array<{ className: string; filePath: string; importer?: string }>
    | { className: string; filePath: string; importer?: string }
  >
) {
  const code = await fs.readFile(filePath, "utf-8");
  const usedComponents = findComponentsInFile(code);

<<<<<<< HEAD
  // Normalize the current file path
=======
>>>>>>> v4-dev
  const normalizedFilePath = filePath
    .replace(/\\/g, "/")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();

  usedComponents.forEach((component) => {
    const rawMapping = fileImports[component];
    let mappings: Array<{
      className: string;
      filePath: string;
      importer?: string;
    }> = [];
    if (Array.isArray(rawMapping)) {
      mappings = rawMapping;
    } else if (rawMapping) {
      mappings = [rawMapping];
    }

    const found = mappings.some((mapping) => {
      const normalizedImporter = (mapping.importer || "")
        .replace(/\\/g, "/")
        .trim()
        .replace(/\/+$/, "")
        .toLowerCase();
      return (
        normalizedFilePath === normalizedImporter ||
        normalizedFilePath.endsWith(normalizedImporter)
      );
    });

    if (!found) {
      console.warn(
        chalk.yellow("Warning: ") +
          chalk.white("Component ") +
          chalk.redBright(`<${component}>`) +
          chalk.white(" is used in ") +
          chalk.blue(filePath) +
          chalk.white(" but not imported.")
      );
    }
  });
}
