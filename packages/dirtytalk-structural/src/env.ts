/// <reference types="node" />
// `process` is undefined in unbundled browser ESM; treat that as production.
// Bundlers that define `process.env.NODE_ENV` still constant-fold the read.
export const isDev = (): boolean => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
};
