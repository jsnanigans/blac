import { ExampleLayout } from '../../shared/ExampleLayout';
import { ThemeControls } from './ThemeControls';
import { ThemePreview } from './ThemePreview';

/**
 * Theme Switcher example demonstrating basic state management.
 *
 * This example shows:
 * 1. Simple Cubit pattern for state management
 * 2. CSS variable integration for theme application
 * 3. LocalStorage persistence
 * 4. Getters for computed values (effectiveMode)
 */
export function ThemeDemo() {
  return (
    <ExampleLayout
      title="Theme Switcher"
      description="Customize the application theme with automatic persistence. A practical introduction to BlaC state management."
      features={[
        'Cubit pattern for simple state updates',
        'Automatic localStorage persistence',
        'CSS variable integration',
        'Computed values with getters',
        'System theme detection',
      ]}
    >
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>Customize Your Theme</h2>
          <p className="text-muted">
            Change theme settings and see them applied immediately. All
            preferences are automatically saved to localStorage.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-lg">
          <ThemeControls />
          <ThemePreview />
        </div>
      </section>

      <section className="stack-md">
        <h2>Key Concepts</h2>
        <div className="stack-xs text-small text-muted">
          <p>
            • <strong>Cubit pattern:</strong> Simple state container with direct
            update methods (setMode, setPrimaryColor, etc.)
          </p>
          <p>
            • <strong>Persistence:</strong> State automatically saved to
            localStorage on every change
          </p>
          <p>
            • <strong>Getters:</strong> The <code>effectiveMode</code> getter
            computes whether to use light or dark mode based on system
            preferences
          </p>
          <p>
            • <strong>CSS Integration:</strong> State changes update CSS custom
            properties, demonstrating how BlaC integrates with existing web APIs
          </p>
          <p>
            • <strong>Immediate feedback:</strong> Changes apply instantly
            across all components
          </p>
        </div>
      </section>

      <section className="stack-md">
        <h2>Try It Out</h2>
        <div className="stack-xs text-small text-muted">
          <p>1. Change the theme mode and watch the entire UI update</p>
          <p>2. Pick a different primary color</p>
          <p>3. Adjust the font size</p>
          <p>4. Refresh the page - your preferences are restored!</p>
          <p>
            5. Check the console to see when components re-render (hint: only
            when necessary!)
          </p>
        </div>
      </section>
    </ExampleLayout>
  );
}
