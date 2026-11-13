import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 独立 Worker / Node 脚本,不套 Next 的前端 lint 规则:
    "notes-app/**",
    "scripts/**",
    // 静态资源(含从 node_modules 拷来的 maplibre worker,压缩过的 500KB 单行 JS):不 lint
    "public/**",
  ]),
]);

export default eslintConfig;
