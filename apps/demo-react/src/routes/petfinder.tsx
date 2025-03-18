import { createFileRoute } from '@tanstack/react-router';
import { PetfinderDemo } from '../components/petfinder/PetfinderDemo';

export const Route = createFileRoute('/petfinder')({
  component: PetfinderPage,
});

function PetfinderPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="prose dark:prose-invert max-w-none">
        <h1 className="text-4xl font-bold mb-6">Find Your Perfect Pet Companion</h1>
        <p className="text-xl mb-8">
          Welcome to the Petfinder demo! This interactive example showcases how to build
          a robust async data workflow with the <code>blac</code> state management library.
          Search for adoptable pets in your area and learn about state management patterns along the way.
        </p>
      </div>
      
      <PetfinderDemo />
    </div>
  );
}