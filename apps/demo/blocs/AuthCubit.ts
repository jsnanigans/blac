import { Cubit } from '@blac/core';

interface AuthState {
  isAuthenticated: boolean;
  userName: string | null;
  isLoading: boolean;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  userName: null,
  isLoading: false,
};

// This Cubit is intended to be shared globally
export class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super(initialAuthState);
    // console.log('AuthCubit Initialized');
  }

  login = async (userName: string) => {
    this.patch({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
    this.patch({ isAuthenticated: true, userName, isLoading: false });
    // console.log(`AuthCubit: User ${userName} logged in.`);
  };

  logout = async () => {
    this.patch({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API call
    this.patch({ 
      ...initialAuthState, // Reset to initial state values for isAuthenticated, userName
      isAuthenticated: false, // Explicitly ensure it's false
      isLoading: false 
    });
    // console.log('AuthCubit: User logged out.');
  };

  // Example of a getter that other Blocs might access if needed
  get currentUserName(): string | null {
    return this.state.userName;
  }

  // // Linter issue with onDispose override, removing for now
  // protected onDispose(): void {
  //   super.onDispose();
  //   console.log('AuthCubit Disposed');
  // }
} 