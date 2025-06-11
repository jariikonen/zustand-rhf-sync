import { defineConfig } from "tsup";
import process from "node:process";

export default defineConfig((options) => {
  const defaultEnv = { NODE_ENV: "production" };
  const localEnv = process.env;
  const envChangesFromArgs = options.env;
  const envToUse = { ...defaultEnv, ...localEnv, ...envChangesFromArgs };
  console.log(
    "Using NODE_ENV:",
    envToUse?.NODE_ENV ? envToUse.NODE_ENV : "undefined",
    "\n",
  );
  return {
    entry: ["src/index.ts"],
    sourcemap: true,
    clean: true,
    dts: true,
    define: {
      "process.env": JSON.stringify(envToUse),
    },
    treeshake: true,
  };
});
