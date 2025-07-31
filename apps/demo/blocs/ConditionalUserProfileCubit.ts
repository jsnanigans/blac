import { Cubit } from '@blac/core';

interface UserProfileState {
  firstName: string;
  lastName: string;
  age: number;
  showFullName: boolean;
  accessCount: number; // To demonstrate updates not affecting UI initially
}

export class ConditionalUserProfileCubit extends Cubit<UserProfileState> {
  constructor() {
    super({
      firstName: 'Jane',
      lastName: 'Doe',
      age: 30,
      showFullName: true,
      accessCount: 0,
    });
  }

  // Getter for full name
  get fullName(): string {
    // Note: Directly calling patch here can cause infinite loops if the getter is used in a dependency array
    // that re-runs the getter. For demo purposes of showing getter access, we avoid direct patch.
    // A more robust way to track getter usage for side effects would be more complex or handled differently.
    return `${this.state.firstName} ${this.state.lastName}`;
  }

  toggleShowFullName = () => {
    this.patch({ showFullName: !this.state.showFullName });
  };
  setFirstName = (firstName: string) => {
    this.patch({ firstName });
  };
  setLastName = (lastName: string) => {
    this.patch({ lastName });
  };
  incrementAge = () => {
    this.patch({ age: this.state.age + 1 });
  };
  // Method to update a non-rendered property, to show it doesn't trigger re-render if not used
  incrementAccessCount = () => {
    this.patch({ accessCount: this.state.accessCount + 1 });
  };

  resetState = () => {
    this.emit({
      firstName: 'Jane',
      lastName: 'Doe',
      age: 30,
      showFullName: true,
      accessCount: 0,
    });
  };
}
