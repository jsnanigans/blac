import { useEffect, useState, useRef } from 'react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Find all headings in the main content
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    // Function to extract headings
    const extractHeadings = () => {
      const headingElements = Array.from(
        mainContent.querySelectorAll('h1, h2, h3, h4, h5, h6')
      );

      // Extract heading info
      const items = headingElements
        .filter(element => element.id) // Only include headings with IDs
        .map(element => ({
          id: element.id,
          text: element.textContent || '',
          level: parseInt(element.tagName.substring(1)), // Extract the heading level number
        }));

      setHeadings(items);

      // Disconnect any existing observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Set up intersection observer to highlight active heading
      observerRef.current = new IntersectionObserver(
        (entries) => {
          // Find the first intersection or the last item that was intersecting
          const intersectingEntry = entries.find(entry => entry.isIntersecting);
          
          if (intersectingEntry) {
            setActiveId(intersectingEntry.target.id);
          }
        },
        { 
          rootMargin: '0px 0px -80% 0px',
          threshold: 0.1
        }
      );

      // Observe all headings
      headingElements.forEach(element => {
        if (element.id && observerRef.current) {
          observerRef.current.observe(element);
        }
      });
    };

    // Extract headings on mount
    extractHeadings();

    // Also set up a MutationObserver to detect content changes
    const mutationObserver = new MutationObserver(() => {
      extractHeadings();
    });

    mutationObserver.observe(mainContent, {
      childList: true,
      subtree: true
    });

    return () => {
      // Clean up observers
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      mutationObserver.disconnect();
    };
  }, []);

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className="pl-4 py-4 border-l border-gray-200 dark:border-gray-800 overflow-y-auto">
      <h2 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white uppercase tracking-wider sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm py-2">
        On this page
      </h2>
      <nav className="text-sm">
        <ul className="space-y-2 overflow-y-visible">
          {headings.map((heading) => (
            <li 
              key={heading.id} 
              style={{ paddingLeft: `${(heading.level - 2) * 0.5}rem` }}
              className={heading.level === 1 ? 'font-medium' : ''}
            >
              <a
                href={`#${heading.id}`}
                className={`block py-1 transition-colors ${
                  activeId === heading.id
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
} 