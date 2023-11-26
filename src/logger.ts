import { impl } from "./impl";

export interface Logger {
  log: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

declare module "./concerns" {
  interface Concerns {
    logger: Logger;
  }
}

export const implementLogger = impl("logger");