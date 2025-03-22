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

function findComponentsInFile(code: string): string[] {
  const cleanedCode = removePhpComments(removeAllHeredocs(code));
  const componentRegex = /<([A-Z][A-Za-z0-9]*)\b/g;
  const components = new Set<string>();
  let match;
  while ((match = componentRegex.exec(cleanedCode)) !== null) {
    components.add(match[1]);
  }
  return Array.from(components);
}

export async function checkComponentImports(
  filePath: string,
  fileImports: Record<string, string>
) {
  const code = await fs.readFile(filePath, "utf-8");
  const usedComponents = findComponentsInFile(code);
  usedComponents.forEach((component) => {
    if (!fileImports[component]) {
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
