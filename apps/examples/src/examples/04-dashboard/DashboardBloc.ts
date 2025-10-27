import { Cubit } from '@blac/core';

/**
 * Dashboard state with multiple independent metrics.
 * Each metric can be updated independently, and only components
 * accessing that specific metric will re-render.
 */
export interface DashboardState {
  // User metrics
  activeUsers: number;
  totalUsers: number;
  newUsersToday: number;

  // Order metrics
  ordersToday: number;
  pendingOrders: number;
  completedOrders: number;

  // Revenue metrics
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;

  // System metrics
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;

  // Status
  lastUpdated: number;
  isAutoUpdating: boolean;
}

/**
 * Dashboard Cubit demonstrating the power of automatic dependency tracking.
 *
 * With traditional React:
 * - Would need React.memo on every widget component
 * - Would need useMemo for every derived value
 * - Would need useCallback for every update function
 * - Still might have issues with object references
 *
 * With Blac:
 * - Components automatically re-render ONLY when accessed properties change
 * - No manual optimization needed
 * - Zero boilerplate
 */
export class DashboardBloc extends Cubit<DashboardState> {
  private autoUpdateInterval?: NodeJS.Timeout;

  constructor() {
    super({
      // User metrics
      activeUsers: 1247,
      totalUsers: 15823,
      newUsersToday: 89,

      // Order metrics
      ordersToday: 342,
      pendingOrders: 23,
      completedOrders: 319,

      // Revenue metrics
      revenueToday: 12450.75,
      revenueThisWeek: 78234.50,
      revenueThisMonth: 345678.90,

      // System metrics
      cpuUsage: 45,
      memoryUsage: 62,
      diskUsage: 38,

      // Status
      lastUpdated: Date.now(),
      isAutoUpdating: false,
    });

    this.onMount = () => {
      console.log('[DashboardBloc] Mounted');
    };

    this.onUnmount = () => {
      console.log('[DashboardBloc] Unmounted');
      this.stopAutoUpdate();
    };

    this.onDispose = () => {
      console.log('[DashboardBloc] Disposed');
      this.stopAutoUpdate();
    };
  }

  /**
   * Update user metrics
   */
  updateUserMetrics = () => {
    this.emit({
      ...this.state,
      activeUsers: this.state.activeUsers + Math.floor(Math.random() * 20 - 10),
      newUsersToday: this.state.newUsersToday + Math.floor(Math.random() * 5),
      totalUsers: this.state.totalUsers + Math.floor(Math.random() * 5),
      lastUpdated: Date.now(),
    });
    console.log('📊 [DashboardBloc] Updated USER metrics');
  };

  /**
   * Update order metrics
   */
  updateOrderMetrics = () => {
    this.emit({
      ...this.state,
      ordersToday: this.state.ordersToday + Math.floor(Math.random() * 10),
      pendingOrders: Math.max(0, this.state.pendingOrders + Math.floor(Math.random() * 6 - 3)),
      completedOrders: this.state.completedOrders + Math.floor(Math.random() * 8),
      lastUpdated: Date.now(),
    });
    console.log('📦 [DashboardBloc] Updated ORDER metrics');
  };

  /**
   * Update revenue metrics
   */
  updateRevenueMetrics = () => {
    const change = (Math.random() - 0.5) * 2000;
    this.emit({
      ...this.state,
      revenueToday: Math.max(0, this.state.revenueToday + change),
      revenueThisWeek: Math.max(0, this.state.revenueThisWeek + change * 1.5),
      revenueThisMonth: Math.max(0, this.state.revenueThisMonth + change * 2),
      lastUpdated: Date.now(),
    });
    console.log('💰 [DashboardBloc] Updated REVENUE metrics');
  };

  /**
   * Update system metrics
   */
  updateSystemMetrics = () => {
    this.emit({
      ...this.state,
      cpuUsage: Math.max(0, Math.min(100, this.state.cpuUsage + Math.floor(Math.random() * 20 - 10))),
      memoryUsage: Math.max(0, Math.min(100, this.state.memoryUsage + Math.floor(Math.random() * 10 - 5))),
      diskUsage: Math.max(0, Math.min(100, this.state.diskUsage + Math.floor(Math.random() * 4 - 2))),
      lastUpdated: Date.now(),
    });
    console.log('⚙️ [DashboardBloc] Updated SYSTEM metrics');
  };

  /**
   * Start auto-updating random metrics every 2 seconds
   */
  startAutoUpdate = () => {
    if (this.state.isAutoUpdating) return;

    this.emit({
      ...this.state,
      isAutoUpdating: true,
    });

    this.autoUpdateInterval = setInterval(() => {
      // Randomly update one of the metric groups
      const random = Math.random();
      if (random < 0.25) {
        this.updateUserMetrics();
      } else if (random < 0.5) {
        this.updateOrderMetrics();
      } else if (random < 0.75) {
        this.updateRevenueMetrics();
      } else {
        this.updateSystemMetrics();
      }
    }, 2000);

    console.log('▶️ [DashboardBloc] Auto-update started');
  };

  /**
   * Stop auto-updating
   */
  stopAutoUpdate = () => {
    if (!this.state.isAutoUpdating) return;

    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
      this.autoUpdateInterval = undefined;
    }

    this.emit({
      ...this.state,
      isAutoUpdating: false,
    });

    console.log('⏸️ [DashboardBloc] Auto-update stopped');
  };

  /**
   * Toggle auto-update
   */
  toggleAutoUpdate = () => {
    if (this.state.isAutoUpdating) {
      this.stopAutoUpdate();
    } else {
      this.startAutoUpdate();
    }
  };
}
