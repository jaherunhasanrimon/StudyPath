import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Module boundary rules — architecture.md §5
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            // modules/scheduler is PURE — no Next.js, Supabase, network, or other modules
            {
              group: ["next", "next/*", "@supabase/*", "pino"],
              message:
                "modules/scheduler must be pure. No Next.js, Supabase, or network dependencies.",
            },
          ],
        },
      ],
    },
    files: ["src/modules/scheduler/**/*.ts", "src/modules/scheduler/**/*.tsx"],
  },
  {
    // Only modules/ai may call a model provider
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@google/generative-ai", "@google-ai/*", "openai", "anthropic"],
              message: "Only modules/ai may import AI provider SDKs.",
            },
          ],
        },
      ],
    },
    files: [
      "src/modules/youtube/**/*.ts",
      "src/modules/scheduler/**/*.ts",
      "src/modules/plans/**/*.ts",
      "src/modules/learning/**/*.ts",
      "src/modules/assessments/**/*.ts",
      "src/modules/notifications/**/*.ts",
      "src/modules/consent/**/*.ts",
      "src/modules/admin/**/*.ts",
      "src/components/**/*.ts",
      "src/components/**/*.tsx",
      "src/lib/**/*.ts",
      "src/app/**/*.ts",
      "src/app/**/*.tsx",
    ],
  },
  {
    // Only modules/youtube may call YouTube Data API
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["googleapis", "@googleapis/*"],
              message: "Only modules/youtube may import YouTube/Google API SDKs.",
            },
          ],
        },
      ],
    },
    files: [
      "src/modules/scheduler/**/*.ts",
      "src/modules/plans/**/*.ts",
      "src/modules/learning/**/*.ts",
      "src/modules/assessments/**/*.ts",
      "src/modules/ai/**/*.ts",
      "src/modules/notifications/**/*.ts",
      "src/modules/consent/**/*.ts",
      "src/modules/admin/**/*.ts",
      "src/components/**/*.ts",
      "src/components/**/*.tsx",
      "src/lib/**/*.ts",
    ],
  },
]);

export default eslintConfig;
