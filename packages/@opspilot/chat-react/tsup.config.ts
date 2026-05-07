import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["cjs", "esm"],
  dts: false, // Disable for now to avoid cross-package issues
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  external: ["react", "react-dom", "@opspilot/chat-core"],
  tsconfig: "./tsconfig.json",
});