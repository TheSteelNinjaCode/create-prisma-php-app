import swaggerJsdoc from "swagger-jsdoc";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import chalk from "chalk";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Define the output path for the swagger.json file
const outputPath = join(__dirname, "../src/app/swagger-docs/apis/pphp-swagger.json");
const bsConnectionInfo = join(__dirname, "bs-config.json");
// Default connection info
const defaultConnectionInfo = {
    local: "http://localhost:3000",
    external: "http://192.168.1.5:3000",
    ui: "http://localhost:3001",
    uiExternal: "http://192.168.1.5:3001",
};
let jsonData = defaultConnectionInfo;
if (existsSync(bsConnectionInfo)) {
    try {
        const data = readFileSync(bsConnectionInfo, "utf8");
        jsonData = JSON.parse(data);
    }
    catch (error) {
        console.error("Error parsing bs-output.json:", error);
    }
}
else {
    console.warn("bs-output.json not found, using default connection info.");
}
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
                url: jsonData.local, // For Development
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
    apis: [join(__dirname, "../src/app/swagger-docs/apis/**/*.ts")], // Adjust to match TypeScript file paths
};
// Generate the Swagger specification
const swaggerSpec = JSON.stringify(swaggerJsdoc(options), null, 2);
// Always generate the swagger.json file
try {
    writeFileSync(outputPath, swaggerSpec, "utf-8");
    console.log(`Swagger JSON has been generated and saved to ${chalk.blue("src/app/swagger-docs/pphp-swagger.json")}`);
}
catch (error) {
    console.error("Error saving Swagger JSON:", error);
}
