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
  const [state, petfinderBloc] = useBloc(PetfinderBloc);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full shadow-lg">
              <svg className="w-12 h-12 text-purple-600 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5.3-86.2 32.6-96.8S212.2 50 226.5 92.9zm-15.7 170.3C194.7 222.7 177.7 203 153.8 192.6c-23.9-10.4-42.4-3.9-45.8 14.4-3.5 18.3 9.7 32.8 38.5 43.5 28.8 10.7 66 7.1 64.4-14.1zM296.7 312.1c40.2-20.3 82.1-7.8 94.8 21.5s-4.9 72.1-45.1 92.5-82.1 7.8-94.8-21.5S256.5 332.4 296.7 312.1zm168.9-72c-13.3-20.2-35.8-28.7-61-24-0.5-37.7-50.3-60.4-87.1-31.6-14.8 11.5-23.3 30.3-23.3 49.3 0 9.3 1.7 18.4 5.1 26.9-10.8-34.3-47.9-46.7-79.1-32.2-30.9 14.4-41.9 51.8-26.6 88.1 15.2 36.3 51.6 45.1 81.9 39.1 19.1 38.3 69.7 33.6 94.8-9.9 19.5 10.2 43.9 8.2 61-5.9 25.3-20.7 22.9-54.4 3.4-80.1h0.2C436.7 263.8 457.3 230.8 465.6 240.1z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-white mb-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
              Petfinder App
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Search for adorable pets available for adoption near you! This demo shows how to use BLoC pattern with a real API.
          </p>
        </header>

        <div className="mb-8">
          <SearchForm />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
            {state.animals.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden border border-purple-100 dark:border-purple-900/30">
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Pets Near You
                    {state.pagination && state.pagination.totalCount > 0 && (
                      <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                        ({state.pagination.totalCount} results)
                      </span>
                    )}
                  </h2>
                </div>
                <PetList />
              </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden border border-purple-100 dark:border-purple-900/30">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                  </svg>
                  How It Works
                </h2>
              </div>
              <div className="p-5">
                <DataFlowDiagram />
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-5">
            <div className="sticky top-8">
              {state.selectedAnimal ? (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden border border-purple-100 dark:border-purple-900/30 transition-all">
                  <PetDetails />
                </div>
              ) : state.animals.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden border border-purple-100 dark:border-purple-900/30 p-8 text-center">
                  <div className="mx-auto w-24 h-24 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    Select a Pet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Click on any pet from the list to view their details and information here.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};