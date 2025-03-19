import { Cubit } from 'blac-next';
import {
  petfinderAPI,
  PetfinderSearchParams,
} from '../services/petfinder.service';

/**
 * Animal interface represents a pet that can be adopted
 */
export interface Animal {
  id: number;
  type: string;
  species: string;
  breeds: {
    primary: string;
    secondary: string | null;
    mixed: boolean;
    unknown: boolean;
  };
  colors: {
    primary: string | null;
    secondary: string | null;
    tertiary: string | null;
  };
  age: string;
  gender: string;
  size: string;
  coat: string | null;
  name: string;
  description: string | null;
  photos: Array<{
    small: string;
    medium: string;
    large: string;
    full: string;
  }>;
  status: string;
  attributes: {
    spayed_neutered: boolean;
    house_trained: boolean;
    declawed: boolean | null;
    special_needs: boolean;
    shots_current: boolean;
  };
  environment: {
    children: boolean | null;
    dogs: boolean | null;
    cats: boolean | null;
  };
  tags: string[];
  contact: {
    email: string | null;
    phone: string | null;
    address: {
      address1: string | null;
      address2: string | null;
      city: string;
      state: string;
      postcode: string;
      country: string;
    };
  };
  published_at: string;
  distance: number | null;
  organization_id: string;
  organization_animal_id: string | null;
  url?: string;
  _links: {
    self: {
      href: string;
    };
    type: {
      href: string;
    };
    organization: {
      href: string;
    };
  };
}

// Define separate loading states for different operations
interface LoadingState {
  isInitialLoading: boolean; // First search loading
  isPaginationLoading: boolean; // When changing pages
  isDetailsLoading: boolean; // When loading a specific pet's details
}

/**
 * PetfinderState interface represents the state of the PetfinderBloc
 */
export interface PetfinderState {
  animals: Animal[];
  loadingState: LoadingState;
  error: string | null;
  searchParams: PetfinderSearchParams;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
  selectedAnimal: Animal | null;
  searchPerformed: boolean;
}

/**
 * PetfinderBloc handles pet search functionality and state management
 *
 * This demonstrates how to use Blac for async data workflows:
 * 1. Manages loading states
 * 2. Handles error scenarios
 * 3. Provides a clean API for components to interact with
 * 4. Separates UI concerns from data fetching logic
 */
export class PetfinderBloc extends Cubit<PetfinderState> {
  constructor() {
    super({
      animals: [],
      loadingState: {
        isInitialLoading: false,
        isPaginationLoading: false,
        isDetailsLoading: false,
      },
      error: null,
      searchParams: {
        limit: 20,
        page: 1,
        status: 'adoptable',
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
      },
      selectedAnimal: null,
      searchPerformed: false,
    });
  }

  /**
   * Helper getter to maintain compatibility with existing code
   */
  get isLoading(): boolean {
    const { isInitialLoading, isPaginationLoading, isDetailsLoading } =
      this.state.loadingState;
    return isInitialLoading || isPaginationLoading || isDetailsLoading;
  }

  /**
   * Update search parameters and optionally trigger a search
   */
  updateSearchParams = (
    params: Partial<PetfinderSearchParams>,
    search = false,
  ) => {
    this.patch({
      searchParams: {
        ...this.state.searchParams,
        ...params,
        page: 1, // Reset to first page when changing search params
      },
    });

    if (search) {
      this.searchAnimals();
    }
  };

  /**
   * Reset search parameters and clear results
   */
  resetSearch = () => {
    this.emit({
      ...this.state,
      searchParams: {
        limit: 20,
        page: 1,
        status: 'adoptable',
      },
      animals: [],
      error: null,
      searchPerformed: false,
      selectedAnimal: null,
      loadingState: {
        isInitialLoading: false,
        isPaginationLoading: false,
        isDetailsLoading: false,
      },
    });
  };

  /**
   * Search for animals based on current search parameters
   */
  searchAnimals = async () => {
    // Determine if this is initial loading or pagination
    const isFirstSearch =
      !this.state.searchPerformed || this.state.animals.length === 0;

    try {
      // Update the appropriate loading state
      this.patch({
        loadingState: {
          ...this.state.loadingState,
          isInitialLoading: isFirstSearch,
          isPaginationLoading: !isFirstSearch,
        },
        error: null,
      });

      const response = await petfinderAPI.getAnimals(this.state.searchParams);

      this.patch({
        animals: response.animals,
        loadingState: {
          ...this.state.loadingState,
          isInitialLoading: false,
          isPaginationLoading: false,
        },
        pagination: {
          currentPage: response.pagination.current_page,
          totalPages: response.pagination.total_pages,
          totalCount: response.pagination.total_count,
        },
        searchPerformed: true,
      });
    } catch (error: unknown) {
      this.patch({
        loadingState: {
          ...this.state.loadingState,
          isInitialLoading: false,
          isPaginationLoading: false,
        },
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while fetching pets',
        searchPerformed: true,
      });
    }
  };

  /**
   * Go to the next page of results
   */
  nextPage = () => {
    if (this.state.pagination.currentPage < this.state.pagination.totalPages) {
      this.updateSearchParams(
        { page: this.state.searchParams.page! + 1 },
        true,
      );
    }
  };

  /**
   * Go to the previous page of results
   */
  previousPage = () => {
    if (this.state.searchParams.page && this.state.searchParams.page > 1) {
      this.updateSearchParams({ page: this.state.searchParams.page - 1 }, true);
    }
  };

  /**
   * Get details for a specific animal
   */
  getAnimalDetails = async (id: number) => {
    try {
      this.patch({
        loadingState: {
          ...this.state.loadingState,
          isDetailsLoading: true,
        },
        error: null,
      });

      const response = await petfinderAPI.getAnimal(id);

      this.patch({
        selectedAnimal: response.animal,
        loadingState: {
          ...this.state.loadingState,
          isDetailsLoading: false,
        },
      });
    } catch (error: unknown) {
      this.patch({
        loadingState: {
          ...this.state.loadingState,
          isDetailsLoading: false,
        },
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while fetching pet details',
      });
    }
  };

  /**
   * Clear the selected animal
   */
  clearSelectedAnimal = () => {
    this.patch({ selectedAnimal: null });
  };

  // Methods for fetching pets
  searchPets = async (
    zipCode: string,
    animalType: string,
    size?: string | null,
    age?: string | null,
  ) => {
    await this.updateSearchParams(
      {
        location: zipCode,
        type: animalType,
        size: size || undefined,
        age: age || undefined,
      },
      true,
    );
  };

  // Form handling
  resetForm = () => {
    this.resetSearch();
  };

  updateZipCode = (zipCode: string) => {
    this.updateSearchParams({ location: zipCode });
  };

  updateAnimalType = (animalType: string) => {
    this.updateSearchParams({ type: animalType });
  };

  updateSize = (size?: string) => {
    this.updateSearchParams({ size });
  };

  updateAge = (age?: string) => {
    this.updateSearchParams({ age });
  };

  selectPet = (petId: string | null) => {
    if (petId) {
      this.getAnimalDetails(parseInt(petId, 10));
    } else {
      this.clearSelectedAnimal();
    }
  };
}

