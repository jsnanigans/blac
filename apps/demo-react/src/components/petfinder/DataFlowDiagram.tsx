import { FC } from 'react';

export const DataFlowDiagram: FC = () => {
  return (
    <div className="space-y-6">
      <p className="text-gray-700 dark:text-gray-300">
        This demo showcases the BLoC (Business Logic Component) pattern using Blac.js to manage state and data flow.
        Here's how it works:
      </p>
      
      <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl">
        <div className="flex flex-col">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* User Input */}
            <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-purple-100 dark:border-purple-700">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <h3 className="font-bold text-gray-900 dark:text-white">User Input</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                User interacts with components like SearchForm, PetList pagination, or clicking a pet
              </p>
              <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-500">Example: User submits search form</p>
              </div>
            </div>
            
            {/* Arrow down */}
            <div className="hidden md:flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-500 transform rotate-90 md:rotate-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* Mobile arrow */}
            <div className="flex md:hidden justify-center my-2">
              <svg className="w-6 h-6 text-purple-500 transform rotate-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* BLoC Event Handling */}
            <div className="flex-1 bg-purple-100 dark:bg-purple-900/30 p-4 rounded-lg shadow-sm border border-purple-200 dark:border-purple-700">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                </svg>
                <h3 className="font-bold text-gray-900 dark:text-white">PetfinderBloc Methods</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Component calls methods on the PetfinderBloc
              </p>
              <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-500">Example: <code>searchAnimals()</code> method</p>
              </div>
            </div>
          </div>
          
          {/* Arrow down */}
          <div className="flex justify-center my-2">
            <svg className="w-6 h-6 text-purple-500 transform rotate-90 md:rotate-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Loading State */}
            <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <h3 className="font-bold text-gray-900 dark:text-white">Loading State Update</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The bloc immediately sets the appropriate loading state
              </p>
              <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-500">Example: <code>patch({'{loadingState: {isInitialLoading: true}}'})</code></p>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-500 transform rotate-90 md:rotate-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* Mobile arrow */}
            <div className="flex md:hidden justify-center my-2">
              <svg className="w-6 h-6 text-purple-500 transform rotate-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* API Call */}
            <div className="flex-1 bg-green-50 dark:bg-green-900/10 p-4 rounded-lg shadow-sm border border-green-100 dark:border-green-800/30">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                <h3 className="font-bold text-gray-900 dark:text-white">API Request</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Async API call to Petfinder with search parameters
              </p>
              <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-500">Example: <code>await petfinderAPI.getAnimals(params)</code></p>
              </div>
            </div>
          </div>
          
          {/* Arrow down */}
          <div className="flex justify-center my-2">
            <svg className="w-6 h-6 text-purple-500 transform rotate-90 md:rotate-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* State Update */}
            <div className="flex-1 bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg shadow-sm border border-yellow-100 dark:border-yellow-800/30">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                </svg>
                <h3 className="font-bold text-gray-900 dark:text-white">State Update</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Update state with API response and reset loading flags
              </p>
              <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-500">Example: <code>patch({'{animals: response.animals, isLoading: false}'})</code></p>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-500 transform rotate-90 md:rotate-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* Mobile arrow */}
            <div className="flex md:hidden justify-center my-2">
              <svg className="w-6 h-6 text-purple-500 transform rotate-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* UI Update */}
            <div className="flex-1 bg-pink-50 dark:bg-pink-900/10 p-4 rounded-lg shadow-sm border border-pink-100 dark:border-pink-800/30">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-pink-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                <h3 className="font-bold text-gray-900 dark:text-white">UI Rerender</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                React components automatically rerender with new state
              </p>
              <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-500">Example: PetList renders animal cards with new data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Benefits of Blac Pattern</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 mr-2 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <h4 className="font-bold text-gray-900 dark:text-white">Separation of Concerns</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Business logic is isolated from UI components, making code more maintainable and testable
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 mr-2 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <h4 className="font-bold text-gray-900 dark:text-white">Centralized State Management</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Single source of truth for application state, reducing bugs from inconsistent data
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 mr-2 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
              </svg>
              <h4 className="font-bold text-gray-900 dark:text-white">Predictable State Updates</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Immutable state transitions with patch() and emit() ensure clear data flow
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 mr-2 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <h4 className="font-bold text-gray-900 dark:text-white">Reactive UI Updates</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Components automatically rerender when state changes, without manual state propagation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};