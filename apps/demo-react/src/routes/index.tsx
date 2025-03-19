import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="space-y-12">
      <section className="dark:card-neon-fuchsia card-neon-fuchsia text-center py-14 px-6 animate-float">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-gradient-multi animate-text-shimmer">
          Welcome to blac
        </h1>
        <p className="text-xl dark:text-cyan-100/90 text-slate-700 max-w-2xl mx-auto mb-8">
          Explore the power of blac state management in this interactive demo application.
        </p>
        <Link 
          to="/demo" 
          className="btn-neon-cyan hover-scale inline-block"
        >
          Explore Demos
        </Link>
      </section>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="dark:card-neon-cyan card-neon-cyan p-8 hover-scale">
          <div className="dark:bg-cyan-500/10 bg-cyan-500/5 rounded-full w-14 h-14 flex items-center justify-center mb-6">
            <svg className="dark:text-cyan-400 text-cyan-600" width="32" height="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-4 text-gradient-cyan">Counter Demo</h2>
          <p className="dark:text-cyan-100/80 text-slate-600 mb-6">
            See how blac manages state with a simple counter example. Explore shared vs isolated state management.
          </p>
          <Link to="/demo/counter" className="text-gradient-cyan inline-flex items-center gap-2 hover:text-glow font-medium">
            Try the Counter 
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        
        <div className="dark:card-neon-blue card-neon-blue p-8 hover-scale">
          <div className="dark:bg-blue-500/10 bg-blue-500/5 rounded-full w-14 h-14 flex items-center justify-center mb-6">
            <svg className="dark:text-blue-400 text-blue-600" width="32" height="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
              <path d="M18 14h-8"></path>
              <path d="M15 18h-5"></path>
              <path d="M10 6h8v4h-8V6Z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-4 text-gradient-blue">Form Demo</h2>
          <p className="dark:text-blue-100/80 text-slate-600 mb-6">
            Experience efficient form handling with blac's state management. See how component re-rendering is optimized.
          </p>
          <Link to="/demo/form" className="text-gradient-blue inline-flex items-center gap-2 hover:text-glow font-medium">
            Try the Form
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        
        <div className="dark:card-neon-pink card-neon-pink p-8 hover-scale">
          <div className="dark:bg-pink-500/10 bg-pink-500/5 rounded-full w-14 h-14 flex items-center justify-center mb-6">
            <svg className="dark:text-pink-400 text-pink-600" width="32" height="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-4 text-gradient-pink">Task Board</h2>
          <p className="dark:text-pink-100/80 text-slate-600 mb-6">
            Try a Kanban-style task board that demonstrates complex state management and interactive UI components.
          </p>
          <Link to="/demo/taskboard" className="text-gradient-pink inline-flex items-center gap-2 hover:text-glow font-medium">
            Try the Task Board
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        
        <div className="dark:card-neon-fuchsia card-neon-fuchsia p-8 hover-scale">
          <div className="dark:bg-fuchsia-500/10 bg-fuchsia-500/5 rounded-full w-14 h-14 flex items-center justify-center mb-6">
            <svg className="dark:text-fuchsia-400 text-fuchsia-600" width="32" height="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-4 text-gradient-fuchsia">Petfinder Demo</h2>
          <p className="dark:text-fuchsia-100/80 text-slate-600 mb-6">
            Explore a real-world application that uses the Petfinder API to search and view adoptable pets.
          </p>
          <Link to="/demo/petfinder" className="text-gradient-fuchsia inline-flex items-center gap-2 hover:text-glow font-medium">
            Try Petfinder
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
