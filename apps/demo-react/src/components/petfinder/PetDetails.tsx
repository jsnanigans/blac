import { FC } from 'react';
import { useBloc } from '@blac/react';
import { PetfinderBloc } from '../../blocs/petfinder.bloc';

export const PetDetails: FC = () => {
  const [state, petfinderBloc] = useBloc(PetfinderBloc);
  const { selectedAnimal: animal, loadingState } = state;
  const { isDetailsLoading } = loadingState;

  if (!animal) {
    return null;
  }

  // Handle closing the details
  const handleClose = () => {
    petfinderBloc.clearSelectedAnimal();
  };

  // Handle image loading error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/images/pet-placeholder.jpg';
    e.currentTarget.onerror = null; // Prevent infinite loop if placeholder also fails
  };

  // Format phone number for better readability
  const formatPhone = (phone: string | null) => {
    if (!phone) return 'Not available';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  // Render tags badges
  const renderTags = (tags: string[]) => {
    if (!tags || tags.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-3">
        {tags.map((tag, index) => (
          <span 
            key={index} 
            className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  };

  // Get adoption URL
  const getAdoptionUrl = () => {
    // Use the animal's URL if available, otherwise construct a fallback URL
    return animal.url || `https://www.petfinder.com/animal/${animal.id}`;
  };

  return (
    <div>
      <div className="relative">
        {isDetailsLoading ? (
          <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
            <div className="animate-pulse flex flex-col items-center">
              <div className="rounded-full bg-purple-200 dark:bg-purple-800 h-24 w-24 mb-4"></div>
              <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-1/2 mb-3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                Pet Details
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                aria-label="Close pet details"
              >
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col mb-6">
                <div className="relative mb-4 bg-gradient-to-b from-purple-100 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/10 rounded-2xl overflow-hidden shadow-md">
                  {animal.photos && animal.photos.length > 0 ? (
                    <div className="relative aspect-w-16 aspect-h-9">
                      <img
                        src={animal.photos[0].large || animal.photos[0].medium}
                        alt={`Photo of ${animal.name}`}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="relative aspect-w-16 aspect-h-9 flex items-center justify-center bg-purple-100 dark:bg-purple-900/20">
                      <svg className="w-24 h-24 text-purple-300 dark:text-purple-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                        <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5.3-86.2 32.6-96.8S212.2 50 226.5 92.9zm-15.7 170.3C194.7 222.7 177.7 203 153.8 192.6c-23.9-10.4-42.4-3.9-45.8 14.4-3.5 18.3 9.7 32.8 38.5 43.5 28.8 10.7 66 7.1 64.4-14.1zM296.7 312.1c40.2-20.3 82.1-7.8 94.8 21.5s-4.9 72.1-45.1 92.5-82.1 7.8-94.8-21.5S256.5 332.4 296.7 312.1zm168.9-72c-13.3-20.2-35.8-28.7-61-24-0.5-37.7-50.3-60.4-87.1-31.6-14.8 11.5-23.3 30.3-23.3 49.3 0 9.3 1.7 18.4 5.1 26.9-10.8-34.3-47.9-46.7-79.1-32.2-30.9 14.4-41.9 51.8-26.6 88.1 15.2 36.3 51.6 45.1 81.9 39.1 19.1 38.3 69.7 33.6 94.8-9.9 19.5 10.2 43.9 8.2 61-5.9 25.3-20.7 22.9-54.4 3.4-80.1h0.2C436.7 263.8 457.3 230.8 465.6 240.1z" fill="currentColor"/>
                      </svg>
                    </div>
                  )}
                  
                  {animal.photos && animal.photos.length > 1 && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3 text-white">
                      <p className="text-xs">
                        {animal.photos.length} photos available
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-start justify-between">
                  <div className="mb-4 md:mb-0">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center">
                      {animal.name}
                      <span className="ml-2 text-sm font-normal bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 py-1 px-2 rounded-full">
                        {animal.status}
                      </span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      {animal.breeds.primary}
                      {animal.breeds.secondary && ` / ${animal.breeds.secondary}`}
                      {animal.breeds.mixed && ' (Mixed)'}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <div className="text-center px-3 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Age</p>
                      <p className="font-semibold text-purple-700 dark:text-purple-300">{animal.age}</p>
                    </div>
                    <div className="text-center px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Gender</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-300">{animal.gender}</p>
                    </div>
                    <div className="text-center px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Size</p>
                      <p className="font-semibold text-green-700 dark:text-green-300">{animal.size}</p>
                    </div>
                    {animal.colors.primary && (
                      <div className="text-center px-3 py-2 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Color</p>
                        <p className="font-semibold text-pink-700 dark:text-pink-300">{animal.colors.primary}</p>
                      </div>
                    )}
                  </div>
                </div>

                {renderTags(animal.tags)}
              </div>
              
              <div className="space-y-6">
                {animal.description && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      About {animal.name}
                    </h3>
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 text-gray-700 dark:text-gray-300">
                      {animal.description}
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Characteristics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(animal.attributes || {}).map(([key, value]) => {
                      if (typeof value !== 'boolean') return null;
                      
                      // Format the attribute name for display
                      const formattedKey = key
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                      
                      return (
                        <div 
                          key={key} 
                          className={`flex items-center p-3 rounded-lg ${
                            value 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          <svg 
                            className={`h-5 w-5 mr-2 ${value ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            {value ? (
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            )}
                          </svg>
                          <span className="text-sm">{formattedKey}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Contact Information
                  </h3>
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                        <p className="text-gray-900 dark:text-gray-100">
                          {animal.contact.email || 'Not available'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                        <p className="text-gray-900 dark:text-gray-100">
                          {formatPhone(animal.contact.phone)}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                        <p className="text-gray-900 dark:text-gray-100">
                          {animal.contact.address.city}, {animal.contact.address.state} {animal.contact.address.postcode}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <a
                  href={getAdoptionUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                  aria-label={`View ${animal.name} on Petfinder`}
                >
                  <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  Adopt {animal.name}
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};