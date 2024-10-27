import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
import psdk from "@prisma/internals";
import { getFileMeta } from "./utils.js";

const { __dirname } = getFileMeta();
const { getDMMF } = psdk;
const schemaPath: string = resolve(__dirname, "../prisma/schema.prisma");
const prismaSchemaJsonPath: string = resolve(__dirname, "prisma-schema.json");

export const prismaSdk = async (): Promise<void> => {
  try {
    const schema = readFileSync(schemaPath, "utf-8");

    // Parse the schema into DMMF (Data Model Meta Format) and then convert to JSON
    const dmmf = await getDMMF({ datamodel: schema });

    // Write the DMMF schema to JSON
    writeFileSync(prismaSchemaJsonPath, JSON.stringify(dmmf, null, 2));
    console.log("Schema converted to JSON!");
  } catch (error) {
    console.error("Error parsing schema:", error);
  }
};
