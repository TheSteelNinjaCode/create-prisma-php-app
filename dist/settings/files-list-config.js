import { readdirSync, statSync, existsSync, writeFileSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// Define __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dirPath = path.join(__dirname, "..", "src", "app");
const jsonFilePath = path.join(__dirname, "files-list.json");

// Function to get all files in the directory
const getAllFiles = (dirPath) => {
  const files = [];

  // Check if directory exists before reading
  if (!existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return files; // Return an empty array if the directory doesn't exist
  }

  const items = readdirSync(dirPath);
  items.forEach((item) => {
    const fullPath = path.join(dirPath, item);
    if (statSync(fullPath).isDirectory()) {
      files.push(...getAllFiles(fullPath)); // Recursive call for subdirectories
    } else {
      // Generate the relative path and ensure it starts with ./src
      const relativePath = `.${path.sep}${path.relative(
        path.join(__dirname, ".."),
        fullPath
      )}`;
      // Replace only the root backslashes with forward slashes and leave inner ones
      files.push(relativePath.replace(/\\/g, "\\").replace(/^\.\.\//, ""));
    }
  });

  return files;
};

// Function to generate the files-list.json
const generateFileListJson = () => {
  const files = getAllFiles(dirPath);

  // If files exist, generate JSON file
  if (files.length > 0) {
    writeFileSync(jsonFilePath, JSON.stringify(files, null, 2));
    console.log(
      `File list has been saved to: settings/files-list.json`
    );
  } else {
    console.error("No files found to save in the JSON file.");
  }
};

// Main function
async function processDirectory() {
  generateFileListJson();
}

processDirectory();
