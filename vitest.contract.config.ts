import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "./vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      include: ["test/source-services/**/*.contract.ts"],
    },
  }),
);
