import { FC } from 'react';

export const DataFlowDiagram: FC = () => {
  return (
    <div className="space-y-6 text-gray-300">
      <p className="text-cyan-100/90">
        This demo showcases the BLoC (Business Logic Component) pattern using Blac.js to manage state and data flow.
        Here's how it works:
      </p>
      
      <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl border border-fuchsia-500/20 shadow-[0_0_15px_rgba(192,38,211,0.2)]">
        <div className="flex flex-col">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* User Input */}
            <div className="flex-1 bg-gray-800/80 p-4 rounded-lg border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">User Input</h3>
              </div>
              <p className="text-sm text-cyan-100/80">
                User interacts with components like SearchForm, PetList pagination, or clicking a pet
              </p>
              <div className="mt-2 border-t border-cyan-500/10 pt-2">
                <p className="text-xs text-cyan-300/50">Example: User submits search form</p>
              </div>
            </div>
            
            {/* Arrow down */}
            <div className="hidden md:flex items-center justify-center">
              <svg className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_3px_rgba(192,38,211,0.5)] transform rotate-90 md:rotate-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* Mobile arrow */}
            <div className="flex md:hidden justify-center my-2">
              <svg className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_3px_rgba(192,38,211,0.5)] transform rotate-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* BLoC Event Handling */}
            <div className="flex-1 bg-gray-800/80 p-4 rounded-lg border border-fuchsia-500/30 shadow-[0_0_10px_rgba(192,38,211,0.15)]">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-fuchsia-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                </svg>
                <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-fuchsia-200">PetfinderBloc Methods</h3>
              </div>
              <p className="text-sm text-fuchsia-100/80">
                Component calls methods on the PetfinderBloc
              </p>
              <div className="mt-2 border-t border-fuchsia-500/10 pt-2">
                <p className="text-xs text-fuchsia-300/50">Example: <code className="bg-fuchsia-900/40 px-1 rounded text-fuchsia-200">searchAnimals()</code> method</p>
              </div>
            </div>
          </div>
          
          {/* Arrow down */}
          <div className="flex justify-center my-2">
            <svg className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_3px_rgba(192,38,211,0.5)] transform rotate-90 md:rotate-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Loading State */}
            <div className="flex-1 bg-gray-800/80 p-4 rounded-lg border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">Loading State Update</h3>
              </div>
              <p className="text-sm text-blue-100/80">
                The bloc immediately sets the appropriate loading state
              </p>
              <div className="mt-2 border-t border-blue-500/10 pt-2">
                <p className="text-xs text-blue-300/50">Example: <code className="bg-blue-900/40 px-1 rounded text-blue-200">patch({'{loadingState: {isInitialLoading: true}}'})</code></p>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <svg className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_3px_rgba(192,38,211,0.5)] transform rotate-90 md:rotate-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* Mobile arrow */}
            <div className="flex md:hidden justify-center my-2">
              <svg className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_3px_rgba(192,38,211,0.5)] transform rotate-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* API Call */}
            <div className="flex-1 bg-gray-800/80 p-4 rounded-lg border border-green-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-200">API Request</h3>
              </div>
              <p className="text-sm text-green-100/80">
                Async API call to Petfinder with search parameters
              </p>
              <div className="mt-2 border-t border-green-500/10 pt-2">
                <p className="text-xs text-green-300/50">Example: <code className="bg-green-900/40 px-1 rounded text-green-200">await petfinderAPI.getAnimals(params)</code></p>
              </div>
            </div>
          </div>
          
          {/* Arrow down */}
          <div className="flex justify-center my-2">
            <svg className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_3px_rgba(192,38,211,0.5)] transform rotate-90 md:rotate-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* State Update */}
            <div className="flex-1 bg-gray-800/80 p-4 rounded-lg border border-yellow-500/30 shadow-[0_0_10px_rgba(251,191,36,0.15)]">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                </svg>
                <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">State Update</h3>
              </div>
              <p className="text-sm text-yellow-100/80">
                Update state with API response and reset loading flags
              </p>
              <div className="mt-2 border-t border-yellow-500/10 pt-2">
                <p className="text-xs text-yellow-300/50">Example: <code className="bg-yellow-900/40 px-1 rounded text-yellow-200">patch({'{animals: response.animals, isLoading: false}'})</code></p>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <svg className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_3px_rgba(192,38,211,0.5)] transform rotate-90 md:rotate-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* Mobile arrow */}
            <div className="flex md:hidden justify-center my-2">
              <svg className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_3px_rgba(192,38,211,0.5)] transform rotate-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* UI Update */}
            <div className="flex-1 bg-gray-800/80 p-4 rounded-lg border border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.15)]">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-pink-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-200">UI Rerender</h3>
              </div>
              <p className="text-sm text-pink-100/80">
                React components automatically rerender with new state
              </p>
              <div className="mt-2 border-t border-pink-500/10 pt-2">
                <p className="text-xs text-pink-300/50">Example: PetList renders animal cards with new data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
        <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200 mb-4">Key Benefits of Blac Pattern</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/80 p-4 rounded-lg border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 mr-2 text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <h4 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">Separation of Concerns</h4>
            </div>
            <p className="text-sm text-indigo-100/80">
              Business logic is isolated from UI components, making code more maintainable and testable
            </p>
          </div>
          
          <div className="bg-gray-800/80 p-4 rounded-lg border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 mr-2 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <h4 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">Centralized State Management</h4>
            </div>
            <p className="text-sm text-cyan-100/80">
              Single source of truth for application state, reducing bugs from inconsistent data
            </p>
          </div>
          
          <div className="bg-gray-800/80 p-4 rounded-lg border border-fuchsia-500/30 shadow-[0_0_10px_rgba(192,38,211,0.15)]">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 mr-2 text-fuchsia-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
              </svg>
              <h4 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-fuchsia-200">Predictable State Updates</h4>
            </div>
            <p className="text-sm text-fuchsia-100/80">
              Immutable state transitions with patch() and emit() ensure clear data flow
            </p>
          </div>
          
          <div className="bg-gray-800/80 p-4 rounded-lg border border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.15)]">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 mr-2 text-pink-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <h4 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-200">Reactive UI Updates</h4>
            </div>
            <p className="text-sm text-pink-100/80">
              Components automatically rerender when state changes, without manual state propagation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};