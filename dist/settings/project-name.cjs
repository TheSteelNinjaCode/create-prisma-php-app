const fs = require("fs");
const path = require("path");

// Path to your JSON configuration file
const configFilePath = path.join(__dirname, "..", "prisma-php.json");

// Use the parent directory name as the new project name
const newProjectName = path.basename(path.join(__dirname, ".."));

// Function to update the project name and paths in the JSON config
function updateProjectNameInConfig(filePath, newProjectName) {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading the JSON file:", err);
      return;
    }

    let config = JSON.parse(data);

    // Extract the old project name from the projectRootPath
    const oldProjectNameMatch = /[^\\]*$/.exec(config.projectRootPath);
    if (!oldProjectNameMatch) {
      console.error(
        "Could not extract the old project name from projectRootPath."
      );
      return;
    }
    const oldProjectName = oldProjectNameMatch[0];

    // Update the projectName
    config.projectName = newProjectName;

    // Update paths containing the old project name
    config.projectRootPath = config.projectRootPath.replace(
      new RegExp(oldProjectName + "$"),
      newProjectName
    );
    config.bsTarget = config.bsTarget.replace(oldProjectName, newProjectName);
    config.bsPathRewrite["^/"] = config.bsPathRewrite["^/"].replace(
      oldProjectName,
      newProjectName
    );

    // Save the updated config back to the JSON file
    fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf8", (err) => {
      if (err) {
        console.error("Error writing the updated JSON file:", err);
        return;
      }
      console.log("The project name and paths have been updated successfully.");
    });
  });
}

// Run the function with your config file path and the new project name
updateProjectNameInConfig(configFilePath, newProjectName);
