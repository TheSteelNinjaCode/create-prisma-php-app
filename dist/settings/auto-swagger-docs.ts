import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import { spawn } from "child_process";
import { prismaSdk } from "./prisma-sdk.js";
import { swaggerConfig } from "./swagger-config.js";
import { getFileMeta } from "./utils.js";
import prismaSchemaConfigJson from "./prisma-schema-config.json";
import prompts from "prompts";
import { exit } from "process";

const { __dirname } = getFileMeta();
const prismaSchemaJsonPath = resolve(__dirname, "./prisma-schema.json");

type PrismaSchemaConfig = {
  swaggerDocsDir: string;
  skipDefaultName: string[];
  skipByPropertyValue: Record<string, boolean>;
  skipFields: string[];
  generateEndpoints: boolean;
  generatePhpClasses: boolean;
};

type Field = {
  name: string;
  kind: string;
  isList: boolean;
  isRequired: boolean;
  isUnique: boolean;
  isId: boolean;
  isReadOnly: boolean;
  hasDefaultValue: boolean;
  type: string;
  isGenerated: boolean;
  isUpdatedAt: boolean;
  default?: {
    name: string;
    args: any[];
  };
};

function shouldSkipField(field: Field): boolean {
  const config: PrismaSchemaConfig = prismaSchemaConfigJson;

  if (field.kind === "object") {
    return true;
  }

  // Skip fields that are explicitly marked to be skipped by name
  if (config.skipFields && config.skipFields.includes(field.name)) {
    return true;
  }

  // Skip fields based on specific property values defined in skipByPropertyValue
  for (const [property, value] of Object.entries(config.skipByPropertyValue)) {
    if ((field as any)[property] === value) {
      return true;
    }
  }

  // Skip ID fields with auto-creation during creation
  if (config.skipDefaultName.includes(field.default?.name || "")) {
    return true;
  }

  return false;
}

// Function to determine an appropriate example based on the field type for Prisma ORM
function getExampleValue(field: Field): any {
  const fieldType = field.type.toLowerCase();

  if (field.isId) {
    // Provide examples based on common ID types
    if (field.hasDefaultValue) {
      switch (field.default?.name.toLowerCase()) {
        case "uuid(4)":
          return `"123e4567-e89b-12d3-a456-426614174000"`; // Example for UUID IDs
        case "cuid":
          return `"cjrscj5d40002s6s0b6nq9jfg"`; // Example for CUID IDs
        case "autoincrement":
          return 1; // Example for auto-increment IDs
        default:
          return `"${field.name}"`; // Default example for unknown ID types
      }
    } else {
      switch (fieldType) {
        case "int":
        case "bigint":
          return 123; // Example for integer and BigInt IDs
        default:
          return `"${field.name}"`; // Default example for unknown ID types
      }
    }
  }

  // Example values for other field types
  switch (fieldType) {
    case "int":
    case "bigint":
      return 123; // Example for integer and BigInt types
    case "float":
    case "decimal":
      return 123.45; // Example for floating-point types
    case "boolean":
      return true; // Example for boolean types
    case "string":
      return `"${field.name}"`; // Example for string types
    case "datetime":
      return `"2024-01-01T00:00:00Z"`; // Example for date/time types
    case "json":
      return `{"key": "value"}`; // Example for JSON type
    case "uuid":
      return `"123e4567-e89b-12d3-a456-426614174000"`; // Example for UUID type
    case "cuid":
      return `"cjrscj5d40002s6s0b6nq9jfg"`; // Example for CUID type
    default:
      return `"${field.name}"`; // Default example for unrecognized types
  }
}

/**
 * Convert a Prisma field type to a Swagger-supported type.
 * @param prismaType The type of the field as defined in the Prisma schema
 * @returns A Swagger-compatible type
 */
function convertPrismaTypeToSwaggerType(prismaType: string): string {
  // Map Prisma types to Swagger-compatible types
  const typeMapping: Record<string, string> = {
    String: "string",
    Int: "integer",
    BigInt: "integer",
    Float: "number",
    Decimal: "number",
    Boolean: "boolean",
    DateTime: "string", // For Swagger, we use "string" with format date-time
    Json: "object",
    UUID: "string",
    CUID: "string",
    Bytes: "string", // Can be represented as base64 strings in Swagger
  };

  // Default to "string" if the type is not found in the mapping
  return typeMapping[prismaType] || "string";
}

// Function to generate properties for Swagger annotations
function generateProperties(fields: Field[]): {
  properties: string;
  allProperties: string;
} {
  let properties = "";
  let allProperties = "";

  fields.forEach((field) => {
    if (field.kind === "object") {
      return;
    }

    const example = getExampleValue(field);
    const fieldType = convertPrismaTypeToSwaggerType(field.type); // Convert Prisma type to Swagger type
    allProperties += `
 *                   ${field.name}:
 *                     type: ${fieldType}
 *                     example: ${example}`;

    if (shouldSkipField(field)) {
      return;
    }

    properties += `
 *                   ${field.name}:
 *                     type: ${fieldType}
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

// Function to find the ID field from the model
function getIdField(fields: Field[]): Field | undefined {
  return fields.find((field) => field.isId);
}

// Function to generate Swagger annotation for a CRUD operation
function generateSwaggerAnnotation(modelName: string, fields: Field[]): string {
  // Extract the ID field dynamically
  const idField = getIdField(fields);
  if (!idField) {
    throw new Error(`No ID field found for model: ${modelName}`);
  }

  const idFieldName = idField.name;
  const idFieldType = convertPrismaTypeToSwaggerType(idField.type); // Convert Prisma type to Swagger type
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
 * /${kebabCaseModelName}/{${idFieldName}}:
 *   get:
 *     summary: Retrieve a single ${modelName} by ${idFieldName}
 *     tags:
 *       - ${modelName}
 *     parameters:
 *       - in: path
 *         name: ${idFieldName}
 *         required: true
 *         description: The ${modelName} ${idFieldName}
 *         schema:
 *           type: ${idFieldType}
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
 * /${kebabCaseModelName}/update/{${idFieldName}}:
 *   put:
 *     summary: Update a ${modelName} by ${idFieldName}
 *     tags:
 *       - ${modelName}
 *     parameters:
 *       - in: path
 *         name: ${idFieldName}
 *         required: true
 *         description: The ${modelName} ${idFieldName}
 *         schema:
 *           type: ${idFieldType}
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
 * /${kebabCaseModelName}/delete/{${idFieldName}}:
 *   delete:
 *     summary: Delete a ${modelName} by ${idFieldName}
 *     tags:
 *       - ${modelName}
 *     parameters:
 *       - in: path
 *         name: ${idFieldName}
 *         required: true
 *         description: The ${modelName} ${idFieldName}
 *         schema:
 *           type: ${idFieldType}
 *     responses:
 *       204:
 *         description: ${modelName} successfully deleted
 *       404:
 *         description: ${modelName} not found
 */`;
}

function isRequiredOnCreate(field: Field): boolean {
  // Required if Prisma says required AND no DB default AND not generated/readOnly/updatedAt/id
  return (
    field.isRequired &&
    !field.hasDefaultValue &&
    !field.isGenerated &&
    !field.isUpdatedAt &&
    !field.isId &&
    !field.isReadOnly
  );
}

function phpRuleBodyForType(prismaTypeLower: string): string {
  switch (prismaTypeLower) {
    case "boolean":
      return `
        $b = Validator::boolean($v);
        if ($b === null) return false;
        $out = (bool)$b;
        return true;`;

    case "int":
    case "bigint":
      return `
        $i = Validator::int($v);
        if ($i === null) return false;
        $out = $i;
        return true;`;

    case "float":
      return `
        $f = Validator::float($v);
        if ($f === null) return false;
        $out = $f;
        return true;`;

    case "decimal":
      return `
        $d = Validator::decimal($v);
        if ($d === null) return false;
        $out = (string)$d; // keep decimals canonical as string
        return true;`;

    case "datetime":
      return `
        $dt = Validator::dateTime($v, 'Y-m-d H:i:s');
        if ($dt === null) return false;
        $out = $dt;
        return true;`;

    case "json":
      return `
        if (is_string($v)) {
          json_decode($v);
          if (json_last_error() !== JSON_ERROR_NONE) return false;
          $out = $v;
          return true;
        } else {
          $enc = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
          if ($enc === false) return false;
          $out = $enc;
          return true;
        }`;

    case "uuid":
      return `
        $s = Validator::uuid($v);
        if ($s === null) return false;
        $out = $s;
        return true;`;

    case "cuid":
      return `
        $s = Validator::cuid($v);
        if ($s === null) return false;
        $out = $s;
        return true;`;

    case "cuid2":
      return `
        $s = Validator::cuid2($v);
        if ($s === null) return false;
        $out = $s;
        return true;`;

    case "string":
    default:
      return `
        $s = Validator::string($v, false); // trim, no HTML escaping for DB
        if ($s === '') return false;
        $out = $s;
        return true;`;
  }
}

function generatePhpSchema(fields: Field[], forUpdate: boolean): string {
  const entries = fields
    .filter((f) => !shouldSkipField(f))
    .map((f) => {
      const t = f.type.toLowerCase();
      const required = forUpdate ? false : isRequiredOnCreate(f);
      const body = phpRuleBodyForType(t).trim();
      return `  '${f.name}' => [
    'type' => '${t}',
    'required' => ${required ? "true" : "false"},
    'validate' => function($v, &$out) {
      ${body}
    },
  ]`;
    })
    .join(",\n");
  return `[\n${entries}\n]`;
}

function idValidatorSnippet(idField: Field): string {
  const t = idField.type.toLowerCase();
  const def = (idField as any).default?.name?.toLowerCase?.() || "";

  // numeric ids (int/bigint or autoincrement())
  if (t === "int" || t === "bigint" || def === "autoincrement") {
    return `
$__id = Validator::int($id);
if ($__id === null) { Boom::badRequest("Invalid ${idField.name}")->toResponse(); return; }
$id = $__id;`;
  }

  // uuid() default or explicit UUID type
  if (t === "uuid" || def === "uuid") {
    return `
if (Validator::uuid($id) === null) { Boom::badRequest("Invalid ${idField.name}")->toResponse(); return; }`;
  }

  // cuid() / cuid2() defaults
  if (def === "cuid") {
    return `
if (Validator::cuid($id) === null) { Boom::badRequest("Invalid ${idField.name}")->toResponse(); return; }`;
  }
  if (def === "cuid2") {
    return `
if (Validator::cuid2($id) === null) { Boom::badRequest("Invalid ${idField.name}")->toResponse(); return; }`;
  }

  // fallback: non-empty string
  return `
$__id = Validator::string($id, false);
if ($__id === '') { Boom::badRequest("Invalid ${idField.name}")->toResponse(); return; }
$id = $__id;`;
}

// Function to generate endpoints for a model
function generateEndpoints(modelName: string, fields: any[]): void {
  const kebabCasedModelName = toKebabCase(modelName);
  const camelCaseModelName =
    modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const baseDir = `src/app/${kebabCasedModelName}`;
  const idField = fields.find((field) => field.isId);
  const fieldsToCreateAndUpdate = fields.filter(
    (field) => shouldSkipField(field) === false
  );
  const idFieldName = idField.name;
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
  const idCheck = idValidatorSnippet(idField);
  const idRouteContent = `<?php

use Lib\\Prisma\\Classes\\Prisma;
use Lib\\Validator;
use Lib\\Headers\\Boom;
use Lib\\Request;

$prisma = Prisma::getInstance();
$id = Request::$dynamicParams->id ?? null;
${idCheck}

$${camelCaseModelName} = $prisma->${camelCaseModelName}->findUnique([
    'where' => [
        '${idFieldName}' => $id
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
  const createDir = `${baseDir}/create`;
  mkdirSync(resolve(__dirname, `../${createDir}`), { recursive: true });
  const createRoutePath = `${createDir}/route.php`;

  const createSchema = generatePhpSchema(fieldsToCreateAndUpdate, false);

  const createRouteContent = `<?php

use Lib\\Prisma\\Classes\\Prisma;
use Lib\\Validator;
use Lib\\Headers\\Boom;
use Lib\\Request;

$prisma = Prisma::getInstance();

/** Schema: type-aware validate + normalize */
$schema = ${createSchema};

$data = [];
foreach ($schema as $field => $rule) {
    $isRequired = $rule['required'] ?? false;

    $has = is_object(Request::$params) && property_exists(Request::$params, $field);
    if (!$has) {
        if ($isRequired) {
            Boom::badRequest("Missing {$field}")->toResponse();
            return;
        }
        continue;
    }

    $raw = Request::$params->$field;
    $out = null;
    if (!($rule['validate'])($raw, $out)) {
        $type = $rule['type'] ?? 'unknown';
        Boom::badRequest("Invalid {$field}", ["Expected type '{$type}'"])->toResponse();
        return;
    }
    $data[$field] = $out;
}

$new${modelName} = $prisma->${camelCaseModelName}->create(['data' => $data]);

if (!$new${modelName}) {
    Boom::internal()->toResponse();
    return;
}

echo json_encode($new${modelName});`;

  writeFileSync(
    resolve(__dirname, `../${createRoutePath}`),
    createRouteContent,
    "utf-8"
  );

  // Endpoint: PUT /{kebabCasedModelName}/update/{id}
  const updateDir = `${baseDir}/update/[id]`;
  mkdirSync(resolve(__dirname, `../${updateDir}`), { recursive: true });
  const updateRoutePath = `${updateDir}/route.php`;

  const updateSchema = generatePhpSchema(fieldsToCreateAndUpdate, true);

  const updateRouteContent = `<?php

use Lib\\Prisma\\Classes\\Prisma;
use Lib\\Validator;
use Lib\\Headers\\Boom;
use Lib\\Request;

$prisma = Prisma::getInstance();
$id = Request::$dynamicParams->id ?? null;
${idCheck}

/** Partial update: nothing is required, but at least one field must be present */
$schema = ${updateSchema};
$data = [];
$any = false;

foreach ($schema as $field => $rule) {
    $has = is_object(Request::$params) && property_exists(Request::$params, $field);
    if (!$has) continue;

    $raw = Request::$params->$field;
    $out = null;
    if (!($rule['validate'])($raw, $out)) {
        $type = $rule['type'] ?? 'unknown';
        Boom::badRequest("Invalid {$field}", ["Expected type '{$type}'"])->toResponse();
        return;
    }
    $data[$field] = $out;
    $any = true;
}

if (!$any) {
    Boom::badRequest("No fields to update")->toResponse();
    return;
}

$updated${modelName} = $prisma->${camelCaseModelName}->update([
  'where' => ['${idFieldName}' => $id],
  'data'  => $data,
]);

if (!$updated${modelName}) {
  Boom::notFound()->toResponse();
  return;
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
${idCheck}

$deleted${modelName} = $prisma->${camelCaseModelName}->delete([
    'where' => [
        '${idFieldName}' => $id
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
      name: "generateApisOnly",
      message: "Do you want to generate swagger docs only?",
      initial: false,
    },
  ]);

  // If the user wants to generate only Swagger docs
  if (response.generateApisOnly) {
    // Update the configuration
    prismaSchemaConfigJson.generateSwaggerDocsOnly = true;

    // Save the updated settings back to the JSON file if needed
    writeFileSync(
      resolve(__dirname, "./prisma-schema-config.json"),
      JSON.stringify(prismaSchemaConfigJson, null, 2),
      "utf-8"
    );

    // Generate Swagger docs and exit
    await swaggerConfig();
    exit(0); // Exit the process here
  }

  // If the user did not select generateApisOnly, ask for other options
  const otherResponses = await prompts([
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

  // Update the configuration based on other responses
  prismaSchemaConfigJson.generateSwaggerDocsOnly = false;
  prismaSchemaConfigJson.generateEndpoints = otherResponses.generateEndpoints;
  prismaSchemaConfigJson.generatePhpClasses = otherResponses.generatePhpClasses;

  // Save the updated settings back to the JSON file
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
  spawn("npx", ["ppo", "generate"], {
    stdio: "inherit",
    shell: true,
  });
}
