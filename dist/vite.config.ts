import { defineConfig, Plugin } from "vite";
import path from "path";
import fg from "fast-glob";
import { writeFileSync } from "fs";

const entries = Object.fromEntries(
  fg.sync("ts/**/*.ts", { ignore: ["**/*.test.ts"] }).map((f) => {
    const rel = f.replace(/^ts\//, "").replace(/\.ts$/, "");
    return [rel, path.resolve(__dirname, f)];
  })
);

function browserSyncNotify(): Plugin {
  const flagFile = path.resolve(__dirname, ".pp", ".vite-build-complete");

  return {
    name: "browsersync-notify",
    writeBundle() {
      writeFileSync(flagFile, Date.now().toString());
    },
  };
}

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
      external: [/^\/js\/.*/],
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  plugins: [browserSyncNotify()],
  esbuild: { legalComments: "none" },
  define: { "process.env.NODE_ENV": '"production"' },
});
