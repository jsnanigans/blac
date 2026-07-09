/** Reserved for future blac-lit configuration. Mirrors configureBlacReact. */
export interface BlacLitConfig {}

let globalConfig: BlacLitConfig = {};

export function configureBlacLit(config: Partial<BlacLitConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/** @internal */
export function getBlacLitConfig(): BlacLitConfig {
  return globalConfig;
}

/** @internal */
export function resetBlacLitConfig(): void {
  globalConfig = {};
}
