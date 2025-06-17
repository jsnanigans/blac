import { Cubit } from '@blac/core';

interface UserProfileState {
  firstName: string;
  lastName: string;
  email: string;
  age: number | undefined;
}

interface UserProfileBlocProps {
  defaultFirstName?: string;
  defaultLastName?: string;
  defaultEmail?: string;
}

export class UserProfileBloc extends Cubit<
  UserProfileState,
  UserProfileBlocProps
> {
  static isolated = true; // Ensures each component instance gets its own UserProfileBloc

  constructor(props?: UserProfileBlocProps) {
    super({
      firstName: props?.defaultFirstName ?? 'John',
      lastName: props?.defaultLastName ?? 'Doe',
      email: props?.defaultEmail ?? 'john.doe@example.com',
      age: undefined,
    });
  }

  updateFirstName = (firstName: string) => {
    this.patch({ firstName });
  };

  updateLastName = (lastName: string) => {
    this.patch({ lastName });
  };

  updateEmail = (email: string) => {
    this.patch({ email });
  };

  updateAge = (age: number) => {
    this.patch({ age });
  };

  // Getter example
  get fullName(): string {
    return `${this.state.firstName} ${this.state.lastName}`;
  }

  get initials(): string {
    const firstInitial = this.state.firstName ? this.state.firstName[0] : '';
    const lastInitial = this.state.lastName ? this.state.lastName[0] : '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }
}

