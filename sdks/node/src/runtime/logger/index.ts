import createDebug from "debug";

export const createLogger = (namespace: string) =>
  createDebug(`kadoa:${namespace}`);

export const logger = {
  client: createLogger("client"),
  wss: createLogger("wss"),
  extraction: createLogger("extraction"),
  http: createLogger("http"),
  workflow: createLogger("workflow"),
  crawl: createLogger("crawl"),
  notifications: createLogger("notifications"),
  schemas: createLogger("schemas"),
  validation: createLogger("validation"),
};
