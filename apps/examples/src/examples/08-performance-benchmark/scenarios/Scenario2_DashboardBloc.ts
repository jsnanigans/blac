import { Cubit } from '@blac/core';

interface DashboardState {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  temperature: number;
  processes: number;
  uptime: number;
  latency: number;
  // Additional metrics for more strain
  gpu: number;
  cache: number;
  swap: number;
  threads: number;
  bandwidth: number;
  errors: number;
  warnings: number;
  requests: number;
}

/**
 * Dashboard benchmark - multiple independent metrics.
 *
 * This showcases BlaC's automatic tracking:
 * - Each widget only accesses its specific metric
 * - When one metric updates, only that widget re-renders
 * - No manual optimization needed!
 */
export class DashboardBloc extends Cubit<DashboardState> {
  private intervals: NodeJS.Timeout[] = [];

  constructor() {
    super({
      cpu: 45,
      memory: 62,
      disk: 78,
      network: 23,
      temperature: 65,
      processes: 142,
      uptime: 99.9,
      latency: 12,
      gpu: 38,
      cache: 54,
      swap: 12,
      threads: 87,
      bandwidth: 156,
      errors: 3,
      warnings: 12,
      requests: 2847,
    });
  }

  updateCpu = () => {
    this.patch({ cpu: Math.random() * 100 });
  };

  updateMemory = () => {
    this.patch({ memory: Math.random() * 100 });
  };

  updateDisk = () => {
    this.patch({ disk: Math.random() * 100 });
  };

  updateNetwork = () => {
    this.patch({ network: Math.random() * 100 });
  };

  updateTemperature = () => {
    this.patch({ temperature: 50 + Math.random() * 40 });
  };

  updateProcesses = () => {
    this.patch({ processes: 100 + Math.floor(Math.random() * 200) });
  };

  updateUptime = () => {
    this.patch({ uptime: 95 + Math.random() * 5 });
  };

  updateLatency = () => {
    this.patch({ latency: 5 + Math.random() * 50 });
  };

  updateGpu = () => {
    this.patch({ gpu: Math.random() * 100 });
  };

  updateCache = () => {
    this.patch({ cache: Math.random() * 100 });
  };

  updateSwap = () => {
    this.patch({ swap: Math.random() * 100 });
  };

  updateThreads = () => {
    this.patch({ threads: 50 + Math.floor(Math.random() * 150) });
  };

  updateBandwidth = () => {
    this.patch({ bandwidth: 50 + Math.random() * 450 });
  };

  updateErrors = () => {
    this.patch({ errors: Math.floor(Math.random() * 20) });
  };

  updateWarnings = () => {
    this.patch({ warnings: Math.floor(Math.random() * 50) });
  };

  updateRequests = () => {
    this.patch({ requests: 1000 + Math.floor(Math.random() * 5000) });
  };

  updateRandom = () => {
    const methods = [
      this.updateCpu,
      this.updateMemory,
      this.updateDisk,
      this.updateNetwork,
      this.updateTemperature,
      this.updateProcesses,
      this.updateUptime,
      this.updateLatency,
      this.updateGpu,
      this.updateCache,
      this.updateSwap,
      this.updateThreads,
      this.updateBandwidth,
      this.updateErrors,
      this.updateWarnings,
      this.updateRequests,
    ];
    const randomMethod = methods[Math.floor(Math.random() * methods.length)];
    randomMethod();
  };

  updateAll = () => {
    this.emit({
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: Math.random() * 100,
      temperature: 50 + Math.random() * 40,
      processes: 100 + Math.floor(Math.random() * 200),
      uptime: 95 + Math.random() * 5,
      latency: 5 + Math.random() * 50,
      gpu: Math.random() * 100,
      cache: Math.random() * 100,
      swap: Math.random() * 100,
      threads: 50 + Math.floor(Math.random() * 150),
      bandwidth: 50 + Math.random() * 450,
      errors: Math.floor(Math.random() * 20),
      warnings: Math.floor(Math.random() * 50),
      requests: 1000 + Math.floor(Math.random() * 5000),
    });
  };

  startAutoUpdate = () => {
    this.stopAutoUpdate();
    // Update different metrics at different rates to create realistic load
    this.intervals.push(setInterval(this.updateCpu, 800));
    this.intervals.push(setInterval(this.updateMemory, 1500));
    this.intervals.push(setInterval(this.updateNetwork, 400));
    this.intervals.push(setInterval(this.updateLatency, 600));
    this.intervals.push(setInterval(this.updateGpu, 900));
    this.intervals.push(setInterval(this.updateRequests, 300));
    this.intervals.push(setInterval(this.updateBandwidth, 500));
  };

  stopAutoUpdate = () => {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
  };

  reset = () => {
    this.stopAutoUpdate();
    this.emit({
      cpu: 45,
      memory: 62,
      disk: 78,
      network: 23,
      temperature: 65,
      processes: 142,
      uptime: 99.9,
      latency: 12,
      gpu: 38,
      cache: 54,
      swap: 12,
      threads: 87,
      bandwidth: 156,
      errors: 3,
      warnings: 12,
      requests: 2847,
    });
  };

  dispose = () => {
    this.stopAutoUpdate();
    super.dispose();
  };
}
