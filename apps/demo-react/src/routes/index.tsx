import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="space-y-8">
      <section className="card text-center py-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Welcome to the blac Demo App
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
          Explore the power of blac state management in this interactive demo application.
        </p>
        <Link 
          to="/demo" 
          className="btn btn-primary inline-block"
        >
          Explore Demos
        </Link>
      </section>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card hover:shadow-md transition-shadow">
          <h2 className="text-2xl font-semibold mb-4 text-foreground dark:text-gray-100">Counter Demo</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            See how blac manages state with a simple counter example. Explore shared vs isolated state management.
          </p>
          <Link to="/demo/counter" className="text-accent hover:underline font-medium">
            Try the Counter →
          </Link>
        </div>
        
        <div className="card hover:shadow-md transition-shadow">
          <h2 className="text-2xl font-semibold mb-4 text-foreground dark:text-gray-100">Form Demo</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Experience efficient form handling with blac's state management. See how component re-rendering is optimized.
          </p>
          <Link to="/demo/form" className="text-accent hover:underline font-medium">
            Try the Form →
          </Link>
        </div>
      </div>
    </div>
  )
}
