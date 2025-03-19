import { FC } from 'react';
import { useBloc } from '@blac/react';
import { PetfinderBloc } from '../../blocs/petfinder.bloc';
import { PetList } from './PetList';
import { PetDetails } from './PetDetails';
import { SearchForm } from './SearchForm';
import { DataFlowDiagram } from './DataFlowDiagram';

/**
 * PetfinderDemo is the main component for the Petfinder demo
 * It serves as an interactive "article" that teaches about blac while providing
 * a real-world example of async data workflows
 */
export const PetfinderDemo: FC = () => {
  const [state] = useBloc(PetfinderBloc);

  return (
    <div className="bg-gradient-to-br from-gray-900 via-purple-950 to-black min-h-screen p-6 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-[10%] w-64 h-64 rounded-full bg-cyan-500/10 blur-[100px]"></div>
        <div className="absolute bottom-0 right-[20%] w-96 h-96 rounded-full bg-fuchsia-500/20 blur-[100px]"></div>
        <div className="absolute top-[40%] right-[10%] w-72 h-72 rounded-full bg-blue-500/10 blur-[100px]"></div>
        <div className="absolute top-[30%] left-[5%] w-80 h-80 rounded-full bg-pink-500/10 blur-[100px]"></div>
        <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 w-full h-40 bg-gradient-to-t from-cyan-500/10 to-transparent blur-[50px]"></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-12 text-center">
          <div className="flex justify-center mb-5">
            <div className="bg-gray-900/60 p-4 rounded-full shadow-[0_0_25px_rgba(139,92,246,0.5)]">
              <svg className="w-16 h-16 text-fuchsia-400 animate-pulse-slow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5.3-86.2 32.6-96.8S212.2 50 226.5 92.9zm-15.7 170.3C194.7 222.7 177.7 203 153.8 192.6c-23.9-10.4-42.4-3.9-45.8 14.4-3.5 18.3 9.7 32.8 38.5 43.5 28.8 10.7 66 7.1 64.4-14.1zM296.7 312.1c40.2-20.3 82.1-7.8 94.8 21.5s-4.9 72.1-45.1 92.5-82.1 7.8-94.8-21.5S256.5 332.4 296.7 312.1zm168.9-72c-13.3-20.2-35.8-28.7-61-24-0.5-37.7-50.3-60.4-87.1-31.6-14.8 11.5-23.3 30.3-23.3 49.3 0 9.3 1.7 18.4 5.1 26.9-10.8-34.3-47.9-46.7-79.1-32.2-30.9 14.4-41.9 51.8-26.6 88.1 15.2 36.3 51.6 45.1 81.9 39.1 19.1 38.3 69.7 33.6 94.8-9.9 19.5 10.2 43.9 8.2 61-5.9 25.3-20.7 22.9-54.4 3.4-80.1h0.2C436.7 263.8 457.3 230.8 465.6 240.1z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 animate-text-shimmer">
            Petfinder App
          </h1>
          <p className="text-cyan-100 max-w-2xl mx-auto text-lg">
            Search for adorable pets available for adoption near you! This demo showcases the BLoC pattern with a real API.
          </p>
          
          <div className="w-40 h-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 mx-auto my-8 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.8)]"></div>
        </header>

        <div className="mb-10 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="bg-gray-900/60 backdrop-blur-xl p-6 rounded-3xl border border-fuchsia-500/20 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <SearchForm />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-10">
            {state.animals.length > 0 && (
              <div className="bg-gradient-to-b from-gray-900/80 to-gray-900/60 backdrop-blur-xl rounded-3xl overflow-hidden border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.3)] transform hover:scale-[1.01] transition-transform duration-300">
                <div className="p-5 border-b border-cyan-500/20">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-5 h-5 mr-2 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">Pets Near You</span>
                    {state.pagination && state.pagination.totalCount > 0 && (
                      <span className="ml-2 text-sm font-normal text-cyan-300/70">
                        ({state.pagination.totalCount} results)
                      </span>
                    )}
                  </h2>
                </div>
                <PetList />
              </div>
            )}
            
            <div className="bg-gradient-to-b from-gray-900/80 to-gray-900/60 backdrop-blur-xl rounded-3xl overflow-hidden border border-fuchsia-500/20 shadow-[0_0_20px_rgba(192,38,211,0.3)] transform hover:scale-[1.01] transition-transform duration-300">
              <div className="p-5 border-b border-fuchsia-500/20">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-fuchsia-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                  </svg>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-fuchsia-200">How It Works</span>
                </h2>
              </div>
              <div className="p-5">
                <DataFlowDiagram />
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-4">
            <div className="bg-gradient-to-b from-gray-900/80 to-gray-900/60 backdrop-blur-xl rounded-3xl overflow-hidden border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)] transform hover:scale-[1.01] transition-transform duration-300 sticky top-8">
              <div className="p-5 border-b border-blue-500/20">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">Blac Implementation</span>
                </h2>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <h3 className="text-md font-semibold text-blue-400 mb-2 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-blue-900/60 flex items-center justify-center mr-2 text-xs text-blue-200 border border-blue-500/30">1</span>
                    State Management
                  </h3>
                  <p className="text-sm text-blue-100/80">
                    The <code className="bg-blue-900/40 px-1 py-0.5 rounded border border-blue-500/30 text-blue-200">PetfinderBloc</code> class extends Blac's <code className="bg-blue-900/40 px-1 py-0.5 rounded border border-blue-500/30 text-blue-200">Cubit</code> to manage application state with immutable updates.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-md font-semibold text-cyan-400 mb-2 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-cyan-900/60 flex items-center justify-center mr-2 text-xs text-cyan-200 border border-cyan-500/30">2</span>
                    Granular Loading States
                  </h3>
                  <p className="text-sm text-cyan-100/80">
                    Instead of a single loading flag, we use a <code className="bg-cyan-900/40 px-1 py-0.5 rounded border border-cyan-500/30 text-cyan-200">LoadingState</code> object with separate properties for different loading scenarios.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-md font-semibold text-fuchsia-400 mb-2 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-fuchsia-900/60 flex items-center justify-center mr-2 text-xs text-fuchsia-200 border border-fuchsia-500/30">3</span>
                    Async Operations
                  </h3>
                  <p className="text-sm text-fuchsia-100/80">
                    All API calls are wrapped in async methods that handle their own loading states and errors.
                  </p>
                  <ol className="list-decimal list-inside text-sm text-fuchsia-100/80 mt-2 space-y-1">
                    <li className="text-xs">Set appropriate loading state</li>
                    <li className="text-xs">Perform the async operation</li>
                    <li className="text-xs">Update state with results</li>
                    <li className="text-xs">Handle errors gracefully</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-md font-semibold text-pink-400 mb-2 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-pink-900/60 flex items-center justify-center mr-2 text-xs text-pink-200 border border-pink-500/30">4</span>
                    Component Integration
                  </h3>
                  <p className="text-sm text-pink-100/80">
                    Components use the <code className="bg-pink-900/40 px-1 py-0.5 rounded border border-pink-500/30 text-pink-200">useBloc</code> hook to connect to the PetfinderBloc:
                  </p>
                  <ul className="list-disc list-inside text-sm text-pink-100/80 mt-2 space-y-1">
                    <li className="text-xs">Current state: for rendering UI</li>
                    <li className="text-xs">Bloc instance: for triggering actions</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-md font-semibold text-indigo-400 mb-2 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-indigo-900/60 flex items-center justify-center mr-2 text-xs text-indigo-200 border border-indigo-500/30">5</span>
                    Immutable Updates
                  </h3>
                  <p className="text-sm text-indigo-100/80">
                    The <code className="bg-indigo-900/40 px-1 py-0.5 rounded border border-indigo-500/30 text-indigo-200">patch()</code> method creates partial updates to the state, ensuring predictable data flow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <footer className="mt-16 text-center text-sm text-cyan-300/50">
          <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 mx-auto mb-6 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
          <p>Built with Blac.js and the Petfinder API</p>
        </footer>
      </div>

      {state.selectedAnimal && <PetDetails />}
    </div>
  );
};