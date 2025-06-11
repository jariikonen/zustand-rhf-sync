/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

// The logger interface
export interface Logger {
  log: (...args: any[]) => void;
}

// A simple logger implementation that logs only when localStorage.debug is set
export const logger: Logger = {
  log: (...args: any[]) => {
    if (typeof window !== "undefined" && window.localStorage?.debug) {
      console.log(...args);
    }
  },
};

// In production, replace logger.log with a no-op to enable dead code elimination
// This can be done via environment variable or bundler define (see below)
if (process.env.NODE_ENV === "production") {
  logger.log = () => {};
}
