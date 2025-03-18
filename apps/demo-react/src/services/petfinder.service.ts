import { env } from '../env';

/**
 * Types for the Petfinder API responses
 */
interface Animal {
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

interface PetfinderResponse {
  animals: Animal[];
  pagination: {
    count_per_page: number;
    total_count: number;
    current_page: number;
    total_pages: number;
    _links: {
      next?: {
        href: string;
      };
      previous?: {
        href: string;
      };
    };
  };
}

interface Location {
  lat: number | null;
  lng: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string;
}

export interface PetfinderSearchParams {
  type?: string;
  breed?: string;
  size?: string;
  gender?: string;
  age?: string;
  color?: string;
  coat?: string;
  status?: string;
  location?: string;
  distance?: number;
  name?: string;
  organization?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

/**
 * PetfinderAPI class for handling API requests
 */
export class PetfinderAPI {
  private static instance: PetfinderAPI;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private constructor() {}

  /**
   * Get singleton instance of PetfinderAPI
   */
  public static getInstance(): PetfinderAPI {
    if (!PetfinderAPI.instance) {
      PetfinderAPI.instance = new PetfinderAPI();
    }
    return PetfinderAPI.instance;
  }

  /**
   * Get an access token for the Petfinder API
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    const response = await fetch('https://api.petfinder.com/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: env.petfinder_api_key,
        client_secret: env.petfinder_api_secret
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Set expiry to slightly before actual expiry to be safe
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    if (!this.accessToken) {
      throw new Error('Failed to get access token');
    }
    return this.accessToken;
  }

  /**
   * Make a request to the Petfinder API
   */
  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const token = await this.getAccessToken();
    const url = new URL(`https://api.petfinder.com/v2/${endpoint}`);
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key].toString) {
        url.searchParams.append(key, params[key].toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get animals from the Petfinder API
   */
  public async getAnimals(params: PetfinderSearchParams = {}): Promise<PetfinderResponse> {
    return this.request<PetfinderResponse>('animals', params);
  }

  /**
   * Get animal types from the Petfinder API
   */
  public async getTypes(): Promise<{ types: Array<{ name: string, coats: string[], colors: string[], genders: string[] }> }> {
    return this.request('types');
  }

  /**
   * Get a single animal from the Petfinder API
   */
  public async getAnimal(id: number): Promise<{ animal: Animal }> {
    return this.request(`animals/${id}`);
  }

  /**
   * Convert a location string to coordinates using a geocoding service
   * For simplicity, we'll just extract the zipcode if present and pass it along
   */
  public async geocodeLocation(locationString: string): Promise<Location> {
    // Extract zipcode if present (simple US zipcode extraction)
    const zipCodeMatch = locationString.match(/\b\d{5}(?:-\d{4})?\b/);
    const zipCode = zipCodeMatch ? zipCodeMatch[0] : null;
    
    // If there's no zipcode, try to parse city and state
    let city: string | null = null;
    let state: string | null = null;
    
    if (!zipCode) {
      // Try to match "City, State" format
      const cityStateMatch = locationString.match(/([^,]+),\s*([A-Z]{2})/i);
      if (cityStateMatch) {
        city = cityStateMatch[1].trim();
        state = cityStateMatch[2].toUpperCase();
      }
    }
    
    return {
      lat: null,
      lng: null,
      address: null,
      city,
      state,
      zipCode,
      country: 'US' as string
    };
  }
}

export const petfinderAPI = PetfinderAPI.getInstance(); 