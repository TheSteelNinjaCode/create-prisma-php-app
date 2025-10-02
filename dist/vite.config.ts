import { defineConfig } from "vite";
import path from "path";
import fg from "fast-glob";

const entries = Object.fromEntries(
  fg.sync("ts/**/*.ts", { ignore: ["**/*.test.ts"] }).map((f) => {
    const rel = f.replace(/^ts\//, "").replace(/\.ts$/, "");
    return [rel, path.resolve(__dirname, f)];
  })
);

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "public/js",
    emptyOutDir: false,
    minify: "esbuild",
    sourcemap: false,
    watch: {
      exclude: ["public/**", "node_modules/**"],
    },
    rollupOptions: {
      input: entries,
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  esbuild: { legalComments: "none" },
  define: { "process.env.NODE_ENV": '"production"' },
});
