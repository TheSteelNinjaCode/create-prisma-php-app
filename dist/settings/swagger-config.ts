import swaggerJsdoc from "swagger-jsdoc";
import { writeFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { getFileMeta } from "./utils.js";
import bsConfigJson from "./bs-config.json";
import prismaPhpConfigJson from "../prisma-php.json";

const { __dirname } = getFileMeta();

export async function swaggerConfig(): Promise<void> {
  const outputPath = join(
    __dirname,
    "../src/app/swagger-docs/apis/pphp-swagger.json"
  );

  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Prisma PHP API Documentation",
        version: "1.0.0",
        description: "API documentation for the Prisma PHP project",
      },
      servers: [
        {
          url: bsConfigJson.local, // For Development
          description: "Development Server",
        },
        {
          url: "your-production-domain", // For Production
          description: "Production Server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: [join(__dirname, "../src/app/swagger-docs/apis/**/*.js")], // Adjust to match JavaScript file paths
  };

  // Generate the Swagger specification
  const swaggerSpec = JSON.stringify(swaggerJsdoc(options), null, 2);

  // Always generate the swagger.json file
  try {
    writeFileSync(outputPath, swaggerSpec, "utf-8");
    console.log(
      `Swagger JSON has been generated and saved to ${chalk.blue(
        "src/app/swagger-docs/apis/pphp-swagger.json"
      )}`
    );
  } catch (error) {
    console.error("Error saving Swagger JSON:", error);
  }
}

if (prismaPhpConfigJson.swaggerDocs && !prismaPhpConfigJson.prisma)
  swaggerConfig();
