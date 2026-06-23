import { globalIgnores } from "eslint/config";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import pluginVue from "eslint-plugin-vue";
import pluginVitest from "@vitest/eslint-plugin";
import pluginOxlint from "eslint-plugin-oxlint";
import skipFormatting from "eslint-config-prettier/flat";

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    files: ["**/*.{vue,ts,mts,tsx}"],
  },

  globalIgnores(["**/dist/**", "**/dist-ssr/**", "**/coverage/**"]),

  ...pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,

  {
    ...pluginVitest.configs.recommended,
    files: ["src/**/*.test.ts", "test/**/*.test.ts"],
  },

  ...pluginOxlint.buildFromOxlintConfigFile(".oxlintrc.json"),

  {
    name: "app/public-module-boundaries",
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/bookmarks/*", "@/checklist/*", "@/source-services/*"],
              message: "Import this module through its public index.ts API.",
            },
          ],
        },
      ],
    },
  },

  {
    name: "app/bookmarks-internal-imports",
    files: ["src/bookmarks/**/*.{vue,ts,mts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  {
    name: "app/checklist-internal-imports",
    files: ["src/checklist/**/*.{vue,ts,mts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/bookmarks/*", "@/source-services/*"],
              message: "Import this module through its public index.ts API.",
            },
          ],
        },
      ],
    },
  },

  {
    name: "app/source-services-internal-imports",
    files: ["src/source-services/**/*.{vue,ts,mts,tsx}", "test/source-services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/bookmarks/*", "@/checklist/*"],
              message: "Import this module through its public index.ts API.",
            },
          ],
        },
      ],
    },
  },

  skipFormatting,
);
