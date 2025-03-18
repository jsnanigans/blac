import { FC } from 'react';
import { useBloc } from '@blac/react';
import { PetfinderBloc } from '../../blocs/petfinder.bloc';

/**
 * Component for searching pets by location and preferences
 */
export const SearchForm: FC = () => {
    const [state, petfinderBloc] = useBloc(PetfinderBloc);

    // Destructure loading states for cleaner access
    const { isInitialLoading } = state.loadingState;
    const hasError = !!state.error;

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        petfinderBloc.searchAnimals();
    };

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        petfinderBloc.updateSearchParams({
            ...state.searchParams,
            [name]: value,
        });
    };

    // Handle reset
    const handleReset = () => {
        petfinderBloc.resetSearch();
    };

    return (
        <div>
            {hasError && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="font-medium">API Error:</p>
                            <p className="text-sm">{state.error}</p>
                        </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                        <button
                            onClick={handleReset}
                            className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-full hover:bg-red-200 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                            Reset Search
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-md border-2 border-purple-100 dark:border-purple-900/30">
                <div className="flex items-center mb-6 border-b border-purple-200 dark:border-purple-800 pb-4">
                    <div className="pr-4">
                        <svg className="w-10 h-10 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                            <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5.3-86.2 32.6-96.8S212.2 50 226.5 92.9zm-15.7 170.3C194.7 222.7 177.7 203 153.8 192.6c-23.9-10.4-42.4-3.9-45.8 14.4-3.5 18.3 9.7 32.8 38.5 43.5 28.8 10.7 66 7.1 64.4-14.1zM296.7 312.1c40.2-20.3 82.1-7.8 94.8 21.5s-4.9 72.1-45.1 92.5-82.1 7.8-94.8-21.5S256.5 332.4 296.7 312.1zm168.9-72c-13.3-20.2-35.8-28.7-61-24-0.5-37.7-50.3-60.4-87.1-31.6-14.8 11.5-23.3 30.3-23.3 49.3 0 9.3 1.7 18.4 5.1 26.9-10.8-34.3-47.9-46.7-79.1-32.2-30.9 14.4-41.9 51.8-26.6 88.1 15.2 36.3 51.6 45.1 81.9 39.1 19.1 38.3 69.7 33.6 94.8-9.9 19.5 10.2 43.9 8.2 61-5.9 25.3-20.7 22.9-54.4 3.4-80.1h0.2C436.7 263.8 457.3 230.8 465.6 240.1z" fill="currentColor" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Find Your Perfect Pet</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Enter your location and preferences below</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Location
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={state.searchParams.location}
                                onChange={handleInputChange}
                                placeholder="ZIP or City, State"
                                className="pl-10 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
                                aria-required="true"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Enter your ZIP code or city and state</p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Pet Type
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <select
                                id="type"
                                name="type"
                                value={state.searchParams.type}
                                onChange={handleInputChange}
                                className="pl-10 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                                aria-label="Pet type"
                            >
                                <option value="">Any Type</option>
                                <option value="dog">Dogs</option>
                                <option value="cat">Cats</option>
                                <option value="rabbit">Rabbits</option>
                                <option value="small-furry">Small Pets</option>
                                <option value="bird">Birds</option>
                                <option value="scales-fins-other">Reptiles & Amphibians</option>
                                <option value="barnyard">Farm Animals</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Age
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                </svg>
                            </div>
                            <select
                                id="age"
                                name="age"
                                value={state.searchParams.age}
                                onChange={handleInputChange}
                                className="pl-10 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                                aria-label="Pet age"
                            >
                                <option value="">Any Age</option>
                                <option value="baby">Baby</option>
                                <option value="young">Young</option>
                                <option value="adult">Adult</option>
                                <option value="senior">Senior</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="size" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Size
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <select
                                id="size"
                                name="size"
                                value={state.searchParams.size}
                                onChange={handleInputChange}
                                className="pl-10 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                                aria-label="Pet size"
                            >
                                <option value="">Any Size</option>
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                                <option value="xlarge">Extra Large</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    {state.searchPerformed && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                            aria-label="Reset search form"
                        >
                            <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                                Reset
                            </div>
                        </button>
                    )}
                    <button
                        type="submit"
                        className={`flex items-center justify-center px-6 py-3 rounded-xl shadow-md text-white
                         bg-purple-600 hover:bg-purple-700 shadow-purple-200 dark:shadow-purple-900/20
                       transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${state.searchPerformed ? '' : 'w-full'}`}
                        aria-label="Search for pets"
                    >
                        {isInitialLoading ? (
                            <span className="inline-flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Searching...
                            </span>
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
                                </svg>
                                Find Pets
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};