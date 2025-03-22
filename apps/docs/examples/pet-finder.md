# Pet Finder Example

The Pet Finder example demonstrates a more complex real-world application using Blac. It shows how to handle asynchronous API calls, manage loading states, and deal with more complex state.

## Overview

This example simulates an application that fetches pets from an API (like Petfinder) and allows users to:
- Search for pets with various filters
- View pet details
- Navigate between pages of results
- Add pets to favorites

## State Management

### PetFinder State

First, we define the state interface for our Pet Finder application:

```tsx
// Types for our domain
interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string;
  age: string;
  gender: string;
  size: string;
  description: string;
  photos: string[];
  status: 'adoptable' | 'adopted' | 'pending';
  contact: {
    email: string;
    phone: string;
    address: {
      city: string;
      state: string;
    };
  };
}

interface SearchParams {
  type: string;
  breed: string;
  age: string;
  gender: string;
  size: string;
  status: string;
  location: string;
  distance: number;
  page: number;
}

interface LoadingState {
  isInitialLoading: boolean;
  isSearching: boolean;
  isLoadingNextPage: boolean;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

// The main state interface
interface PetFinderState {
  animals: Pet[];
  searchParams: SearchParams;
  loadingState: LoadingState;
  pagination: PaginationInfo;
  selectedPet: Pet | null;
  favorites: Pet[];
  error: string | null;
}
```

### PetFinder Bloc

Now we implement the Bloc that manages this state:

```tsx
import { Cubit } from 'blac-next';
import { petfinderAPI } from '../services/petfinderAPI';

class PetFinderBloc extends Cubit<PetFinderState> {
  constructor() {
    super({
      animals: [],
      searchParams: {
        type: '',
        breed: '',
        age: '',
        gender: '',
        size: '',
        status: 'adoptable',
        location: '',
        distance: 100,
        page: 1,
      },
      loadingState: {
        isInitialLoading: false,
        isSearching: false,
        isLoadingNextPage: false,
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
      },
      selectedPet: null,
      favorites: [],
      error: null,
    });
  }

  // Update search parameters
  updateSearchParams = (params: Partial<SearchParams>) => {
    this.patch({
      searchParams: {
        ...this.state.searchParams,
        ...params,
        // Reset to page 1 when search params change
        page: params.page || 1,
      },
    });
  };

  // Search for animals
  searchAnimals = async () => {
    try {
      this.patch({
        loadingState: {
          ...this.state.loadingState,
          isInitialLoading: true,
        },
        error: null,
      });

      const response = await petfinderAPI.getAnimals(this.state.searchParams);

      this.patch({
        animals: response.animals,
        loadingState: {
          ...this.state.loadingState,
          isInitialLoading: false,
        },
        pagination: {
          currentPage: response.pagination.current_page,
          totalPages: response.pagination.total_pages,
          totalCount: response.pagination.total_count,
        },
      });
    } catch (error) {
      this.patch({
        loadingState: {
          ...this.state.loadingState,
          isInitialLoading: false,
        },
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  // Load the next page of results
  loadNextPage = async () => {
    // Don't load if we're already at the last page
    if (this.state.pagination.currentPage >= this.state.pagination.totalPages) {
      return;
    }

    try {
      this.patch({
        loadingState: {
          ...this.state.loadingState,
          isLoadingNextPage: true,
        },
        error: null,
      });

      const nextPage = this.state.pagination.currentPage + 1;
      const params = {
        ...this.state.searchParams,
        page: nextPage,
      };

      const response = await petfinderAPI.getAnimals(params);

      this.patch({
        animals: [...this.state.animals, ...response.animals],
        searchParams: params,
        loadingState: {
          ...this.state.loadingState,
          isLoadingNextPage: false,
        },
        pagination: {
          currentPage: response.pagination.current_page,
          totalPages: response.pagination.total_pages,
          totalCount: response.pagination.total_count,
        },
      });
    } catch (error) {
      this.patch({
        loadingState: {
          ...this.state.loadingState,
          isLoadingNextPage: false,
        },
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  // Select a pet to view details
  selectPet = (petId: string) => {
    const pet = this.state.animals.find((animal) => animal.id === petId);
    this.patch({ selectedPet: pet || null });
  };

  // Clear the selected pet
  clearSelectedPet = () => {
    this.patch({ selectedPet: null });
  };

  // Add a pet to favorites
  addToFavorites = (pet: Pet) => {
    // Don't add duplicates
    if (!this.state.favorites.some((fav) => fav.id === pet.id)) {
      this.patch({
        favorites: [...this.state.favorites, pet],
      });
    }
  };

  // Remove a pet from favorites
  removeFromFavorites = (petId: string) => {
    this.patch({
      favorites: this.state.favorites.filter((pet) => pet.id !== petId),
    });
  };
}

export default PetFinderBloc;
```

## UI Components

### Search Form

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import PetFinderBloc from './PetFinderBloc';

function SearchForm() {
  const [state, bloc] = useBloc(PetFinderBloc);
  const { searchParams } = state;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    bloc.searchAnimals();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    bloc.updateSearchParams({ [name]: value });
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <h2>Find Your Perfect Pet</h2>
      
      <div className="form-group">
        <label htmlFor="type">Animal Type</label>
        <select
          id="type"
          name="type"
          value={searchParams.type}
          onChange={handleInputChange}
        >
          <option value="">Any</option>
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
          <option value="rabbit">Rabbit</option>
          <option value="bird">Bird</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="location">Location</label>
        <input
          id="location"
          name="location"
          type="text"
          value={searchParams.location}
          onChange={handleInputChange}
          placeholder="City, State or ZIP"
        />
      </div>

      <div className="form-group">
        <label htmlFor="distance">Distance (miles)</label>
        <input
          id="distance"
          name="distance"
          type="number"
          min="1"
          max="500"
          value={searchParams.distance}
          onChange={handleInputChange}
        />
      </div>

      {/* Additional form fields for age, gender, size, etc. */}
      
      <button type="submit" className="search-button">
        Search
      </button>
    </form>
  );
}

export default SearchForm;
```

### Pet List

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import PetFinderBloc from './PetFinderBloc';

function PetList() {
  const [state, bloc] = useBloc(PetFinderBloc);
  const { animals, loadingState, pagination, error } = state;

  const handleLoadMore = () => {
    bloc.loadNextPage();
  };

  const handlePetClick = (petId: string) => {
    bloc.selectPet(petId);
  };

  if (loadingState.isInitialLoading) {
    return <div className="loading">Loading pets...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (animals.length === 0) {
    return <div className="no-results">No pets found. Try different search criteria.</div>;
  }

  return (
    <div className="pet-list">
      <h2>Found {pagination.totalCount} pets</h2>
      
      <div className="pet-grid">
        {animals.map((pet) => (
          <div key={pet.id} className="pet-card" onClick={() => handlePetClick(pet.id)}>
            {pet.photos.length > 0 ? (
              <img src={pet.photos[0]} alt={pet.name} />
            ) : (
              <div className="no-photo">No Photo</div>
            )}
            <div className="pet-info">
              <h3>{pet.name}</h3>
              <p>{pet.breed} • {pet.age} • {pet.gender}</p>
              <p>{pet.contact.address.city}, {pet.contact.address.state}</p>
              <span className="status">{pet.status}</span>
            </div>
          </div>
        ))}
      </div>
      
      {pagination.currentPage < pagination.totalPages && (
        <button
          onClick={handleLoadMore}
          disabled={loadingState.isLoadingNextPage}
          className="load-more"
        >
          {loadingState.isLoadingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

export default PetList;
```

### Pet Details

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import PetFinderBloc from './PetFinderBloc';

function PetDetails() {
  const [state, bloc] = useBloc(PetFinderBloc);
  const { selectedPet, favorites } = state;

  if (!selectedPet) {
    return null;
  }

  const isFavorite = favorites.some((pet) => pet.id === selectedPet.id);

  const handleToggleFavorite = () => {
    if (isFavorite) {
      bloc.removeFromFavorites(selectedPet.id);
    } else {
      bloc.addToFavorites(selectedPet);
    }
  };

  const handleClose = () => {
    bloc.clearSelectedPet();
  };

  return (
    <div className="pet-details-modal">
      <div className="pet-details">
        <button className="close-button" onClick={handleClose}>×</button>
        
        <div className="pet-details-header">
          <h2>{selectedPet.name}</h2>
          <button
            className={`favorite-button ${isFavorite ? 'favorited' : ''}`}
            onClick={handleToggleFavorite}
          >
            {isFavorite ? '❤️ Favorited' : '🤍 Add to Favorites'}
          </button>
        </div>
        
        <div className="pet-details-content">
          <div className="pet-photos">
            {selectedPet.photos.map((photo, index) => (
              <img key={index} src={photo} alt={`${selectedPet.name} ${index + 1}`} />
            ))}
          </div>
          
          <div className="pet-info">
            <p><strong>Type:</strong> {selectedPet.type}</p>
            <p><strong>Breed:</strong> {selectedPet.breed}</p>
            <p><strong>Age:</strong> {selectedPet.age}</p>
            <p><strong>Gender:</strong> {selectedPet.gender}</p>
            <p><strong>Size:</strong> {selectedPet.size}</p>
            <p><strong>Status:</strong> {selectedPet.status}</p>
          </div>
          
          <div className="pet-description">
            <h3>About {selectedPet.name}</h3>
            <p>{selectedPet.description}</p>
          </div>
          
          <div className="pet-contact">
            <h3>Contact Info</h3>
            <p><strong>Email:</strong> {selectedPet.contact.email}</p>
            <p><strong>Phone:</strong> {selectedPet.contact.phone}</p>
            <p><strong>Location:</strong> {selectedPet.contact.address.city}, {selectedPet.contact.address.state}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PetDetails;
```

### Main PetFinder Component

```tsx
import React, { useEffect } from 'react';
import { useBloc } from '@blac/react';
import PetFinderBloc from './PetFinderBloc';
import SearchForm from './SearchForm';
import PetList from './PetList';
import PetDetails from './PetDetails';
import Favorites from './Favorites';

function PetFinder() {
  const [state, bloc] = useBloc(PetFinderBloc);
  
  // Perform initial search when component mounts
  useEffect(() => {
    bloc.searchAnimals();
  }, []);
  
  return (
    <div className="pet-finder">
      <h1>Pet Finder</h1>
      
      <div className="pet-finder-layout">
        <aside className="sidebar">
          <SearchForm />
          <Favorites />
        </aside>
        
        <main className="main-content">
          <PetList />
        </main>
      </div>
      
      {state.selectedPet && <PetDetails />}
    </div>
  );
}

export default PetFinder;
```

## Key Takeaways

1. **Complex State Management**: The Pet Finder example demonstrates how Blac can manage complex, nested state with multiple concerns.

2. **Async Operations**: Shows how to handle async operations like API calls with proper loading states and error handling.

3. **Selective Updates**: Uses the `patch` method to update specific parts of the state without affecting others.

4. **Component Composition**: Demonstrates how multiple components can share and interact with the same state through a shared Bloc.

5. **Separation of Concerns**: Business logic is contained in the Bloc, while UI components are focused on rendering and user interaction. 