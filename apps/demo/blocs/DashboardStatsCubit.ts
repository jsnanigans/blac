import { Blac, Cubit } from '@blac/core';
import { AuthCubit } from './AuthCubit';

interface DashboardStatsState {
  statsMessage: string;
  isLoading: boolean;
  lastLoadedForUser: string | null;
}

const initialStatsState: DashboardStatsState = {
  statsMessage: 'No stats loaded yet.',
  isLoading: false,
  lastLoadedForUser: null,
};

// This Cubit will try to access AuthCubit
// For this demo, we can make it isolated or shared. Let's make it isolated to show
// an isolated Cubit can still access a shared one (AuthCubit).
export class DashboardStatsCubit extends Cubit<DashboardStatsState> {
  static isolated = true; // Each instance of the demo component will have its own stats cubit

  constructor() {
    super(initialStatsState);
  }

  loadDashboard = async () => {
    this.patch({ isLoading: true, statsMessage: 'Loading dashboard data...' });
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call

    let userName: string | null = 'Guest (Auth Unavailable)'; // Default in case of error
    let isAuthenticated = false;

    try {
      // Here is the Bloc-to-Bloc communication
      const authCubit = Blac.getBloc(AuthCubit, { throwIfNotFound: true }); // Blac.getBloc() can throw if not found
      isAuthenticated = authCubit.state.isAuthenticated;
      userName =
        authCubit.state.userName ||
        (isAuthenticated ? 'Authenticated User (No Name)' : 'Guest');
    } catch (error) {
      console.warn(
        `DashboardStatsCubit: Error getting AuthCubit - ${(error as Error).message}. Assuming guest.`,
      );
    }

    if (isAuthenticated) {
      this.patch({
        statsMessage: `Showing personalized stats for ${userName}. Total Sales: $${Math.floor(Math.random() * 10000)}. Active Users: ${Math.floor(Math.random() * 100)}.`,
        isLoading: false,
        lastLoadedForUser: userName,
      });
    } else {
      this.patch({
        statsMessage: `Showing generic stats for ${userName}. Please log in for personalized data.`,
        isLoading: false,
        lastLoadedForUser: 'Guest',
      });
    }
  };

  resetStats = () => {
    this.emit(initialStatsState);
  };
}
