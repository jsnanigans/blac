import { FC } from 'react';
import { useBloc } from '@blac/react';
import { PetfinderBloc } from '../../blocs/petfinder.bloc';

interface DataFlowDiagramProps {
  compact?: boolean;
}

export const DataFlowDiagram: FC<DataFlowDiagramProps> = ({ compact = false }) => {
  const [state, petfinderBloc] = useBloc(PetfinderBloc);
  
  // Destructure loading states for cleaner access
  const { isInitialLoading, isPaginationLoading, isDetailsLoading } = state.loadingState;
  
  // Determine active states for visualization
  const isSearchActive = state.searchPerformed;
  const isAnimalActive = state.animals.length > 0;
  const isDetailsActive = state.selectedAnimal !== null;
  
  // API is being used when any loading state is active
  const isApiActive = isInitialLoading || isPaginationLoading || isDetailsLoading;
  
  // Bloc state changes when any state is active
  const isBlocActive = isSearchActive || isAnimalActive || isDetailsActive;
  
  // Simplified node component
  const Node = ({ title, subtitle, className }: { title: string; subtitle: string; className: string }) => (
    <div className={`absolute ${className} p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm`}>
      <div className="text-center">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
      </div>
    </div>
  );
  
  // Simplified arrow component
  const Arrow = ({ className }: { className: string }) => (
    <div className={`absolute ${className} bg-gray-300 dark:bg-gray-600`}></div>
  );
  
  return (
    <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800" 
         style={{ height: compact ? '220px' : '320px' }}>
      <div className="relative w-full h-full">
        {/* Diagram elements with simplified styling */}
        <div className="relative w-full h-full">
          {/* User Input */}
          <Node 
            title="User Input" 
            subtitle="Search Form" 
            className="top-4 left-1/2 transform -translate-x-1/2 w-32"
          />
          
          {/* Search Flow Arrow */}
          <Arrow className="top-[60px] left-1/2 transform -translate-x-1/2 w-[1px] h-[30px]" />
          
          {/* PetfinderBloc - Highlighted when Bloc is active */}
          <div className={`absolute ${compact ? 'top-[95px]' : 'top-[120px]'} left-1/2 transform -translate-x-1/2 w-40 p-3 rounded-lg border transition-colors duration-300 shadow-sm
                          ${isBlocActive 
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' 
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
            <div className="text-center">
              <div className={`font-medium ${isBlocActive ? 'text-blue-600 dark:text-blue-300' : ''}`}>
                PetfinderBloc
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Manages State & API Calls</div>
            </div>
          </div>
          
          {/* API - Highlighted when API is active */}
          <div className={`absolute ${compact ? 'top-[95px]' : 'top-[120px]'} right-4 w-32 p-3 rounded-lg border transition-colors duration-300 shadow-sm
                          ${isApiActive 
                            ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-500' 
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
            <div className="text-center">
              <div className={`font-medium ${isApiActive ? 'text-green-600 dark:text-green-300' : ''}`}>
                Petfinder API
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">External Data Source</div>
            </div>
          </div>
          
          {/* API Flow Arrow */}
          <Arrow className={`${compact ? 'top-[110px]' : 'top-[135px]'} right-[75px] h-[1px] w-[40px] ${isApiActive ? 'bg-green-400 dark:bg-green-500' : ''}`} />
          
          {/* Results Flow Arrow */}
          <Arrow className={`${compact ? 'top-[145px]' : 'top-[185px]'} left-1/2 transform -translate-x-1/2 w-[1px] h-[30px]`} />
          
          {/* UI Components */}
          <Node 
            title="UI Components" 
            subtitle="PetList & PetDetails" 
            className={`${compact ? 'top-[180px]' : 'top-[220px]'} left-1/2 transform -translate-x-1/2 w-32`}
          />
          
          {/* Details Flow (only in non-compact mode) */}
          {!compact && (
            <>
              <Node 
                title="Pet Details" 
                subtitle="Selected Animal" 
                className="top-[170px] left-4 w-32"
              />
              
              <Arrow className="top-[185px] left-[75px] h-[1px] w-[40px]" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};