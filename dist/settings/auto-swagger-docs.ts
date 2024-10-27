import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import { spawn } from "child_process";
import { prismaSdk } from "./prisma-sdk.js";
import { swaggerConfig } from "./swagger-config.js";
import { getFileMeta } from "./utils.js";
import prismaSchemaConfigJson from "./prisma-schema-config.json";
import prompts from "prompts";

const { __dirname } = getFileMeta();
const prismaSchemaJsonPath = resolve(__dirname, "./prisma-schema.json");

// Function to generate properties for Swagger annotations
function generateProperties(fields: any[]): {
  properties: string;
  allProperties: string;
} {
  let properties = "";
  let allProperties = "";

  fields.forEach((field) => {
    if (field.kind === "object") {
      return;
    }

    const example = field.example || (field.isId ? 1 : `"${field.name}"`);
    allProperties += `
   *                   ${field.name}:
   *                     type: ${field.type.toLowerCase()}
   *                     example: ${example}`;

    if (prismaSchemaConfigJson.skipFields.includes(field.name)) {
      return;
    }

    if (prismaSchemaConfigJson.skipDefaultName.includes(field.default?.name)) {
      return;
    }

    properties += `
   *                   ${field.name}:
   *                     type: ${field.type.toLowerCase()}
   *                     example: ${example}`;
  });

  return { properties, allProperties };
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

// Function to generate Swagger annotation for a CRUD operation
function generateSwaggerAnnotation(modelName: string, fields: any[]): string {
  const { properties, allProperties } = generateProperties(fields);
  const kebabCaseModelName = toKebabCase(modelName);

  return `/**
   * @swagger
   * tags:
   *   name: ${modelName}
   *   description: ${modelName} management API
   */
  
  /**
   * @swagger
   * /${kebabCaseModelName}:
   *   get:
   *     summary: Retrieve a list of ${modelName}
   *     tags:
   *       - ${modelName}
   *     responses:
   *       200:
   *         description: A list of ${modelName}
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:${allProperties}
   */
  
  /**
   * @swagger
   * /${kebabCaseModelName}/{id}:
   *   get:
   *     summary: Retrieve a single ${modelName} by ID
   *     tags:
   *       - ${modelName}
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: The ${modelName} ID
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: A single ${modelName} object
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:${allProperties}
   *       404:
   *         description: ${modelName} not found
   */
  
  /**
   * @swagger
   * /${kebabCaseModelName}/create:
   *   post:
   *     summary: Create a new ${modelName}
   *     tags:
   *       - ${modelName}
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:${properties}
   *     responses:
   *       201:
   *         description: ${modelName} created successfully.
   */
  
  /**
   * @swagger
   * /${kebabCaseModelName}/update/{id}:
   *   put:
   *     summary: Update a ${modelName} by ID
   *     tags:
   *       - ${modelName}
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: The ${modelName} ID
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:${properties}
   *     responses:
   *       200:
   *         description: ${modelName} updated successfully.
   *       404:
   *         description: ${modelName} not found
   */
  
  /**
   * @swagger
   * /${kebabCaseModelName}/delete/{id}:
   *   delete:
   *     summary: Delete a ${modelName} by ID
   *     tags:
   *       - ${modelName}
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: The ${modelName} ID
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: ${modelName} successfully deleted
   *       404:
   *         description: ${modelName} not found
   */
  `;
}

// Function to generate dynamic validation rules and request payloads
function generateValidationAndPayload(fields: any[]) {
  let validations = "";
  let payload = "";
  let variableAssignments = "";

  fields.forEach((field) => {
    if (field.kind === "object") return; // Skip relations for now

    // Skip fields that are explicitly marked to be skipped
    if (prismaSchemaConfigJson.skipFields.includes(field.name)) {
      return;
    }

    // Skip ID fields with auto-creation during creation
    if (prismaSchemaConfigJson.skipDefaultName.includes(field.default?.name)) {
      return;
    }

    // Define variable assignments
    const variableName = field.name;
    variableAssignments += `$${variableName} = Request::$params->${variableName} ?? null;\n`;

    // Dynamic validation for required fields (excluding skipped fields)
    if (field.isRequired) {
      const fieldType = field.type.toLowerCase();
      validations += `
if (!Validator::${fieldType}($${variableName})) {
    Boom::badRequest("Invalid ${variableName}")->toResponse();
}`;
    }

    // Prepare payload dynamically
    payload += `'${variableName}' => $${variableName},\n        `;
  });

  return { validations, payload, variableAssignments };
}

// Function to generate dynamic ID validation logic for update and find-by-ID routes
function generateIdValidationLogic(idField: any) {
  const fieldType = idField.type.toLowerCase();

  if (["cuid", "uuid", "autoincrement"].includes(idField.default?.name)) {
    return `
if (!Validator::${fieldType}($id)) {
    Boom::badRequest("Invalid ${idField.name}")->toResponse();
}`;
  }

  return ""; // No specific validation needed otherwise
}

// Function to generate endpoints for a model
function generateEndpoints(modelName: string, fields: any[]): void {
  const kebabCasedModelName = toKebabCase(modelName);
  const camelCaseModelName =
    modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const baseDir = `src/app/${kebabCasedModelName}`;
  const idField = fields.find((field) => field.isId);
  const baseDirPath = resolve(__dirname, `../${baseDir}`);

  mkdirSync(baseDirPath, { recursive: true });

  // Endpoint: GET /{kebabCasedModelName}
  const listRoutePath = `${baseDir}/route.php`;
  const listRouteContent = `<?php
  
  use Lib\\Prisma\\Classes\\Prisma;
  
  $prisma = Prisma::getInstance();
  
  $${camelCaseModelName} = $prisma->${camelCaseModelName}->findMany();
  echo json_encode($${camelCaseModelName});`;
  writeFileSync(
    resolve(__dirname, `../${listRoutePath}`),
    listRouteContent,
    "utf-8"
  );

  // Endpoint: GET /{kebabCasedModelName}/{id}
  const idDir = `${baseDir}/[id]`;
  mkdirSync(resolve(__dirname, `../${idDir}`), { recursive: true });
  const idRoutePath = `${idDir}/route.php`;
  const idValidationLogic = generateIdValidationLogic(idField);
  const idRouteContent = `<?php

use Lib\\Prisma\\Classes\\Prisma;
use Lib\\Validator;
use Lib\\Headers\\Boom;
use Lib\\Request;

$prisma = Prisma::getInstance();
$id = Request::$dynamicParams->id ?? null;
${idValidationLogic}

$${camelCaseModelName} = $prisma->${camelCaseModelName}->findUnique([
    'where' => [
        'id' => $id
    ]
]);

if (!$${camelCaseModelName}) {
    Boom::notFound()->toResponse();
}
echo json_encode($${camelCaseModelName});`;

  writeFileSync(
    resolve(__dirname, `../${idRoutePath}`),
    idRouteContent,
    "utf-8"
  );

  // Endpoint: POST /{kebabCasedModelName}/create
  const {
    validations: createValidations,
    payload: createPayload,
    variableAssignments,
  } = generateValidationAndPayload(fields);

  const createDir = `${baseDir}/create`;
  mkdirSync(resolve(__dirname, `../${createDir}`), { recursive: true });
  const createRoutePath = `${createDir}/route.php`;
  const createRouteContent = `<?php

use Lib\\Prisma\\Classes\\Prisma;
use Lib\\Validator;
use Lib\\Headers\\Boom;
use Lib\\Request;

$prisma = Prisma::getInstance();
${
  variableAssignments.length > 0
    ? variableAssignments
    : "// Your custom variable assignments here"
}
${
  createValidations.length > 0
    ? createValidations
    : "\n// Your custom validation logic here"
}

$new${modelName} = $prisma->${camelCaseModelName}->create([
    'data' => [
        ${createPayload}
    ]
]);

if (!$new${modelName}) {
    Boom::internal()->toResponse();
}
echo json_encode($new${modelName});`;

  writeFileSync(
    resolve(__dirname, `../${createRoutePath}`),
    createRouteContent,
    "utf-8"
  );

  // Endpoint: PUT /{kebabCasedModelName}/update/{id}
  const { validations: updateValidations, payload: updatePayload } =
    generateValidationAndPayload(fields);

  const updateDir = `${baseDir}/update/[id]`;
  mkdirSync(resolve(__dirname, `../${updateDir}`), { recursive: true });
  const updateRoutePath = `${updateDir}/route.php`;
  const updateRouteContent = `<?php

use Lib\\Prisma\\Classes\\Prisma;
use Lib\\Validator;
use Lib\\Headers\\Boom;
use Lib\\Request;

$prisma = Prisma::getInstance();
$id = Request::$dynamicParams->id ?? null;
${
  variableAssignments.length > 0
    ? variableAssignments
    : "// Your custom variable assignments here"
}
${idValidationLogic}
${
  updateValidations.length > 0
    ? updateValidations
    : "\n// Your custom validation logic here"
}

$updated${modelName} = $prisma->${camelCaseModelName}->update([
    'where' => ['id' => $id],
    'data' => [
        ${updatePayload}
    ]
]);

if (!$updated${modelName}) {
    Boom::notFound()->toResponse();
}
echo json_encode($updated${modelName});`;

  writeFileSync(
    resolve(__dirname, `../${updateRoutePath}`),
    updateRouteContent,
    "utf-8"
  );

  // Endpoint: DELETE /{kebabCasedModelName}/delete/{id}
  const deleteDir = `${baseDir}/delete/[id]`;
  mkdirSync(resolve(__dirname, `../${deleteDir}`), { recursive: true });
  const deleteRoutePath = `${deleteDir}/route.php`;
  const deleteRouteContent = `<?php

use Lib\\Prisma\\Classes\\Prisma;
use Lib\\Validator;
use Lib\\Headers\\Boom;
use Lib\\Request;

$prisma = Prisma::getInstance();
$id = Request::$dynamicParams->id ?? null;
${idValidationLogic}

$deleted${modelName} = $prisma->${camelCaseModelName}->delete([
    'where' => [
        'id' => $id
    ]
]);

if (!$deleted${modelName}) {
    Boom::notFound()->toResponse();
}
echo json_encode($deleted${modelName});`;

  writeFileSync(
    resolve(__dirname, `../${deleteRoutePath}`),
    deleteRouteContent,
    "utf-8"
  );
}

async function promptUserForGenerationOptions() {
  const response = await prompts([
    {
      type: "confirm",
      name: "generateEndpoints",
      message: "Do you want to generate endpoints?",
      initial: false,
    },
    {
      type: "confirm",
      name: "generatePhpClasses",
      message: "Do you want to generate PHP classes?",
      initial: false,
    },
  ]);

  // Update the configuration based on user input
  prismaSchemaConfigJson.generateEndpoints = response.generateEndpoints;
  prismaSchemaConfigJson.generatePhpClasses = response.generatePhpClasses;

  // Optionally, you can save the updated settings back to the JSON file
  writeFileSync(
    resolve(__dirname, "./prisma-schema-config.json"),
    JSON.stringify(prismaSchemaConfigJson, null, 2),
    "utf-8"
  );
}

// Function to read the updated Prisma JSON schema directly
function readUpdatedSchema() {
  try {
    const schemaContent = readFileSync(prismaSchemaJsonPath, "utf-8");
    return JSON.parse(schemaContent);
  } catch (error) {
    console.error("Error reading updated schema:", error);
    return null;
  }
}

async function generateSwaggerDocs(modelsToGenerate: string[]): Promise<void> {
  // Read the updated schema directly from the file
  const updatedSchema = readUpdatedSchema();
  if (!updatedSchema) {
    console.error("Failed to read updated JSON schema.");
    return;
  }

  const models = updatedSchema.datamodel.models;

  if (modelsToGenerate.includes("all")) {
    models.forEach((model: any) => {
      generateAndSaveSwaggerDocsForModel(model);
    });
  } else {
    modelsToGenerate.forEach((modelName) => {
      const model = models.find((m: any) => m.name.toLowerCase() === modelName);
      if (model) {
        generateAndSaveSwaggerDocsForModel(model);
      } else {
        console.error(`Model "${modelName}" not found in the schema.`);
      }
    });
  }
}

function generateAndSaveSwaggerDocsForModel(model: any): void {
  const kebabCaseModelName = toKebabCase(model.name);
  const swaggerAnnotation = generateSwaggerAnnotation(model.name, model.fields);
  const whereToSave = `${prismaSchemaConfigJson.swaggerDocsDir}/${kebabCaseModelName}.js`;
  const outputFilePath = resolve(__dirname, `../${whereToSave}`);

  writeFileSync(outputFilePath, swaggerAnnotation, "utf-8");
  console.log(
    `Swagger annotations for model "${model.name}" generated at: ${chalk.blue(
      whereToSave
    )}`
  );

  if (prismaSchemaConfigJson.generateEndpoints) {
    generateEndpoints(model.name, model.fields);
  }
}

await promptUserForGenerationOptions();

const args = process.argv.slice(2);
const modelsToGenerate =
  args.length > 0 ? args.map((arg) => arg.toLowerCase()) : ["all"];

await prismaSdk();
await generateSwaggerDocs(modelsToGenerate);
await swaggerConfig();

if (prismaSchemaConfigJson.generatePhpClasses) {
  spawn("npx", ["php", "generate", "class"], {
    stdio: "inherit",
    shell: true,
  });
}
