import { FC } from 'react';
import { useBloc } from '@blac/react';
import { PetfinderBloc } from '../../blocs/petfinder.bloc';

export const PetList: FC = () => {
  const [state, petfinderBloc] = useBloc(PetfinderBloc);
  
  // Destructure loading states for cleaner access
  const { isPaginationLoading } = state.loadingState;
  const { animals, pagination } = state;
  
  // Handle pet selection
  const handleSelectPet = (id: number) => {
    petfinderBloc.getAnimalDetails(id);
  };
  
  // Get appropriate placeholder for missing images
  const getPlaceholderImage = (type: string) => {
    const defaultImage = '/images/pet-placeholder.jpg';
    
    switch(type?.toLowerCase()) {
      case 'dog':
        return '/images/dog-placeholder.jpg';
      case 'cat':
        return '/images/cat-placeholder.jpg';
      default:
        return defaultImage;
    }
  };
  
  // Handle image loading error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, type: string) => {
    e.currentTarget.src = getPlaceholderImage(type);
    e.currentTarget.onerror = null; // Prevent infinite loop if placeholder also fails
  };

  if (animals.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No pets found. Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {animals.map((animal) => (
          <div 
            key={animal.id}
            onClick={() => handleSelectPet(animal.id)}
            className="p-4 hover:bg-purple-50 dark:hover:bg-purple-900/10 cursor-pointer transition-colors duration-200 flex flex-col sm:flex-row gap-4"
            tabIndex={0}
            role="button"
            aria-label={`View details for ${animal.name}, a ${animal.age} ${animal.gender} ${animal.breeds.primary}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectPet(animal.id);
              }
            }}
          >
            <div className="relative w-full sm:w-36 h-36 flex-shrink-0 rounded-2xl overflow-hidden bg-purple-100 dark:bg-purple-900/20">
              {animal.photos && animal.photos.length > 0 ? (
                <img
                  src={animal.photos[0].medium}
                  alt={`Photo of ${animal.name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageError(e, animal.type)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-purple-300 dark:text-purple-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                    <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5.3-86.2 32.6-96.8S212.2 50 226.5 92.9zm-15.7 170.3C194.7 222.7 177.7 203 153.8 192.6c-23.9-10.4-42.4-3.9-45.8 14.4-3.5 18.3 9.7 32.8 38.5 43.5 28.8 10.7 66 7.1 64.4-14.1zM296.7 312.1c40.2-20.3 82.1-7.8 94.8 21.5s-4.9 72.1-45.1 92.5-82.1 7.8-94.8-21.5S256.5 332.4 296.7 312.1zm168.9-72c-13.3-20.2-35.8-28.7-61-24-0.5-37.7-50.3-60.4-87.1-31.6-14.8 11.5-23.3 30.3-23.3 49.3 0 9.3 1.7 18.4 5.1 26.9-10.8-34.3-47.9-46.7-79.1-32.2-30.9 14.4-41.9 51.8-26.6 88.1 15.2 36.3 51.6 45.1 81.9 39.1 19.1 38.3 69.7 33.6 94.8-9.9 19.5 10.2 43.9 8.2 61-5.9 25.3-20.7 22.9-54.4 3.4-80.1h0.2C436.7 263.8 457.3 230.8 465.6 240.1z" fill="currentColor"/>
                  </svg>
                </div>
              )}
              <div className="absolute top-2 left-2 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 text-xs font-medium py-1 px-2 rounded-full shadow-sm">
                {animal.type}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  {animal.name}
                </h3>
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                    {animal.age}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                    {animal.gender}
                  </span>
                  {animal.size && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                      {animal.size}
                    </span>
                  )}
                </div>
              </div>
              
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{animal.breeds.primary}</span>
                {animal.breeds.secondary && ` / ${animal.breeds.secondary}`}
              </p>
              
              <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg className="flex-shrink-0 mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{animal.contact.address.city}, {animal.contact.address.state}</span>
              </div>
              
              {animal.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {animal.description}
                </p>
              )}
              
              <div className="mt-2 flex flex-wrap gap-1">
                {animal.tags && animal.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {pagination && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <button
            onClick={() => petfinderBloc.previousPage()}
            disabled={isPaginationLoading || pagination.currentPage <= 1}
            className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
              isPaginationLoading || pagination.currentPage <= 1
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
            }`}
            aria-label="Previous page"
          >
            <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Previous
          </button>

          <div className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">{pagination.currentPage}</span> of{' '}
            <span className="font-medium">{pagination.totalPages}</span>
          </div>

          <button
            onClick={() => petfinderBloc.nextPage()}
            disabled={isPaginationLoading || pagination.currentPage >= pagination.totalPages}
            className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
              isPaginationLoading || pagination.currentPage >= pagination.totalPages
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
            }`}
            aria-label="Next page"
          >
            Next
            <svg className="ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
      
      {isPaginationLoading && (
        <div className="flex justify-center items-center p-8">
          <div className="animate-bounce bg-purple-500 p-2 w-10 h-10 ring-1 ring-gray-200 dark:ring-gray-700 shadow-lg rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};