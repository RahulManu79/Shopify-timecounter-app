import * as esbuild from "esbuild";
import { gzipSync } from "zlib";
import { readFileSync } from "fs";

const isWatch = process.argv.includes("--watch");

const config = {
  entryPoints: ["src/widget.jsx"],
  bundle: true,
  minify: true,
  outfile: "../extensions/countdown-timer/assets/countdown-widget.js",
  format: "iife",
  target: ["es2018"],
  jsx: "transform",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  jsxImportSource: "preact",
  // Alias react to preact/compat for any transitive deps
  alias: {
    react: "preact/compat",
    "react-dom": "preact/compat",
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  // Tree-shake aggressively
  treeShaking: true,
  legalComments: "none",
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("[widget] Watching for changes...");
} else {
  await esbuild.build(config);

  // Report bundle size
  const file = readFileSync("../extensions/countdown-timer/assets/countdown-widget.js");
  const gzipped = gzipSync(file);
  const rawKB = (file.length / 1024).toFixed(1);
  const gzipKB = (gzipped.length / 1024).toFixed(1);

  console.log(
    `[widget] Built: ${rawKB} KB raw, ${gzipKB} KB gzipped`
  );

  if (gzipped.length > 30 * 1024) {
    console.error("[widget] WARNING: Bundle exceeds 30KB gzipped target!");
    process.exit(1);
  } else {
    console.log("[widget] Bundle is within the <30KB gzipped target.");
  }
}
