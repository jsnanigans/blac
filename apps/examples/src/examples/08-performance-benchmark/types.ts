/**
 * Shared types for performance benchmark scenarios
 */

export interface ListItem {
  id: string;
  value: number;
  color: string;
}

export interface BenchmarkMetrics {
  fps: number;
  renderCount: number;
  avgLatency: number;
  lastUpdate: number;
}

export type ScenarioType =
  | 'list-updates'
  | 'nested-objects'
  | 'high-frequency'
  | 'computed-values';

export interface ScenarioConfig {
  id: ScenarioType;
  name: string;
  description: string;
  itemCount: number;
}
