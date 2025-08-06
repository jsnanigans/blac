import React, { useState } from 'react';
import { Bloc, Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

// State for async operations with error handling
interface ApiState {
  data: any | null;
  loading: boolean;
  error: string | null;
  successCount: number;
  errorCount: number;
}

// Simple Cubit with async operations and error handling
class ApiCubit extends Cubit<ApiState> {
  constructor() {
    super({
      data: null,
      loading: false,
      error: null,
      successCount: 0,
      errorCount: 0
    });
  }

  // Simulated API call that can succeed or fail
  fetchData = async (shouldFail: boolean = false) => {
    // Set loading state
    this.emit({ ...this.state, loading: true, error: null });

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (shouldFail) {
        throw new Error('Network request failed: 500 Internal Server Error');
      }

      // Simulate successful response
      const data = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        message: 'Data fetched successfully',
        value: Math.floor(Math.random() * 100)
      };

      this.emit({
        data,
        loading: false,
        error: null,
        successCount: this.state.successCount + 1,
        errorCount: this.state.errorCount
      });
    } catch (error) {
      this.emit({
        ...this.state,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCount: this.state.errorCount + 1
      });
    }
  };

  // Retry with exponential backoff
  fetchWithRetry = async (maxRetries: number = 3) => {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      this.emit({ 
        ...this.state, 
        loading: true, 
        error: retryCount > 0 ? `Retry attempt ${retryCount}/${maxRetries}...` : null 
      });

      try {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        
        // 50% chance of success for demo purposes
        if (Math.random() > 0.5) {
          const data = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            message: `Success after ${retryCount + 1} attempt(s)`,
            value: Math.floor(Math.random() * 100)
          };

          this.emit({
            data,
            loading: false,
            error: null,
            successCount: this.state.successCount + 1,
            errorCount: this.state.errorCount
          });
          return;
        } else {
          throw new Error(`Attempt ${retryCount + 1} failed`);
        }
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          this.emit({
            ...this.state,
            loading: false,
            error: `Failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            errorCount: this.state.errorCount + 1
          });
        }
      }
    }
  };

  reset = () => {
    this.emit({
      data: null,
      loading: false,
      error: null,
      successCount: 0,
      errorCount: 0
    });
  };

  clearError = () => {
    this.emit({ ...this.state, error: null });
  };
}

// Event classes for Bloc pattern with async
class SearchEvent {
  constructor(public readonly query: string) {}
}

class CancelSearchEvent {}

interface SearchState {
  results: Array<{ id: string; title: string; description: string }>;
  loading: boolean;
  error: string | null;
  query: string;
  abortController: AbortController | null;
}

// Bloc with async event handlers and cancellation
class SearchBloc extends Bloc<SearchState, SearchEvent | CancelSearchEvent> {
  constructor() {
    super({
      results: [],
      loading: false,
      error: null,
      query: '',
      abortController: null
    });

    this.on(SearchEvent, this.handleSearch);
    this.on(CancelSearchEvent, this.handleCancel);
  }

  private handleSearch = async (event: SearchEvent, emit: (state: SearchState) => void) => {
    // Cancel previous search if any
    if (this.state.abortController) {
      this.state.abortController.abort();
    }

    const abortController = new AbortController();

    // Set loading state
    emit({
      ...this.state,
      loading: true,
      error: null,
      query: event.query,
      abortController
    });

    try {
      // Simulate API delay
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 1500);
        
        // Listen for abort signal
        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Search cancelled'));
        });
      });

      // Check if aborted
      if (abortController.signal.aborted) {
        throw new Error('Search cancelled');
      }

      // Simulate search results
      const results = event.query
        ? Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({
            id: `${event.query}-${i}`,
            title: `Result ${i + 1} for "${event.query}"`,
            description: `Description for search result ${i + 1}`
          }))
        : [];

      emit({
        results,
        loading: false,
        error: null,
        query: event.query,
        abortController: null
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Search cancelled') {
        emit({
          ...this.state,
          loading: false,
          abortController: null
        });
      } else {
        emit({
          ...this.state,
          results: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Search failed',
          abortController: null
        });
      }
    }
  };

  private handleCancel = (_event: CancelSearchEvent, emit: (state: SearchState) => void) => {
    if (this.state.abortController) {
      this.state.abortController.abort();
      emit({
        ...this.state,
        loading: false,
        abortController: null
      });
    }
  };

  search = (query: string) => {
    this.add(new SearchEvent(query));
  };

  cancelSearch = () => {
    this.add(new CancelSearchEvent());
  };
}

const AsyncOperationsDemo: React.FC = () => {
  const [apiState, apiCubit] = useBloc(ApiCubit);
  const [searchState, searchBloc] = useBloc(SearchBloc);
  const [searchInput, setSearchInput] = useState('');

  return (
    <div style={{ display: 'flex', gap: '30px' }}>
      <div style={{ flex: 1 }}>
        <h4>Async Operations with Error Handling</h4>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button 
              onClick={() => apiCubit.fetchData(false)}
              disabled={apiState.loading}
            >
              Fetch Data (Success)
            </Button>
            <Button 
              onClick={() => apiCubit.fetchData(true)}
              disabled={apiState.loading}
              variant="destructive"
            >
              Fetch Data (Fail)
            </Button>
            <Button 
              onClick={() => apiCubit.fetchWithRetry(3)}
              disabled={apiState.loading}
              variant="outline"
            >
              Fetch with Retry
            </Button>
            <Button 
              onClick={apiCubit.reset}
              variant="outline"
            >
              Reset
            </Button>
          </div>
        </div>

        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '4px',
          minHeight: '150px'
        }}>
          {apiState.loading && (
            <div style={{ textAlign: 'center', color: '#666' }}>
              <div>Loading...</div>
              {apiState.error && (
                <div style={{ fontSize: '0.9em', marginTop: '10px' }}>
                  {apiState.error}
                </div>
              )}
            </div>
          )}

          {!apiState.loading && apiState.error && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#fee', 
              border: '1px solid #fcc',
              borderRadius: '4px',
              color: '#c00'
            }}>
              <strong>Error:</strong> {apiState.error}
              <Button 
                onClick={apiCubit.clearError}
                size="sm"
                variant="outline"
                style={{ marginLeft: '10px' }}
              >
                Dismiss
              </Button>
            </div>
          )}

          {!apiState.loading && apiState.data && (
            <div>
              <strong>Success!</strong>
              <pre style={{ marginTop: '10px', fontSize: '0.85em' }}>
                {JSON.stringify(apiState.data, null, 2)}
              </pre>
            </div>
          )}

          {!apiState.loading && !apiState.data && !apiState.error && (
            <div style={{ textAlign: 'center', color: '#999' }}>
              Click a button to fetch data
            </div>
          )}
        </div>

        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '0.85em'
        }}>
          <strong>Statistics:</strong>
          <div>Success: {apiState.successCount} | Errors: {apiState.errorCount}</div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h4>Cancellable Search (Bloc)</h4>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  searchBloc.search(searchInput);
                }
              }}
              placeholder="Enter search query"
              style={{ flex: 1 }}
            />
            <Button 
              onClick={() => searchBloc.search(searchInput)}
              disabled={searchState.loading}
            >
              Search
            </Button>
            {searchState.loading && (
              <Button 
                onClick={searchBloc.cancelSearch}
                variant="destructive"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '4px',
          minHeight: '200px'
        }}>
          {searchState.loading && (
            <div style={{ textAlign: 'center', color: '#666' }}>
              Searching for "{searchState.query}"...
              <div style={{ fontSize: '0.8em', marginTop: '10px' }}>
                (Takes 1.5 seconds - try cancelling!)
              </div>
            </div>
          )}

          {!searchState.loading && searchState.error && (
            <div style={{ color: '#c00' }}>
              Error: {searchState.error}
            </div>
          )}

          {!searchState.loading && searchState.results.length > 0 && (
            <div>
              <strong>Results for "{searchState.query}":</strong>
              <div style={{ marginTop: '10px' }}>
                {searchState.results.map(result => (
                  <div key={result.id} style={{
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>{result.title}</div>
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      {result.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!searchState.loading && searchState.query && searchState.results.length === 0 && !searchState.error && (
            <div style={{ textAlign: 'center', color: '#999' }}>
              No results found for "{searchState.query}"
            </div>
          )}

          {!searchState.loading && !searchState.query && (
            <div style={{ textAlign: 'center', color: '#999' }}>
              Enter a search query
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AsyncOperationsDemo;