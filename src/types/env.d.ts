declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The environment in which the application is running (e.g., "development", "production").
     */
    readonly NODE_ENV: "development" | "production" | "test"; // Define possible values
  }
}
