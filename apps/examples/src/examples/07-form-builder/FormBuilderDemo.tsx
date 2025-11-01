import { useBloc } from '@blac/react';
import { useEffect } from 'react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { FormBuilderBloc } from './FormBuilderBloc';
import { FieldList } from './FieldList';
import { FieldEditor } from './FieldEditor';
import { FormPreview } from './FormPreview';
import { Button } from '../../shared/components';

export function FormBuilderDemo() {
  const [state, formBuilder] = useBloc(FormBuilderBloc);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          formBuilder.redo();
        } else {
          formBuilder.undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formBuilder]);

  return (
    <ExampleLayout
      title="Form Builder"
      description="Complex nested state management with undo/redo, validation, and preview modes."
      features={[
        'Deeply nested state updates',
        'Array manipulations (add, remove, reorder)',
        'Validation patterns',
        'Undo/redo with history stack',
        'Preview mode with live validation',
        'Export to JSON schema',
      ]}
    >
      {/* Controls */}
      <section className="stack-sm">
        <div className="row-md flex-wrap">
          <div className="row-sm">
            <Button
              variant={state.mode === 'edit' ? 'primary' : 'ghost'}
              onClick={() => formBuilder.setMode('edit')}
            >
              Edit Mode
            </Button>
            <Button
              variant={state.mode === 'preview' ? 'primary' : 'ghost'}
              onClick={() => formBuilder.setMode('preview')}
            >
              Preview Mode
            </Button>
          </div>

          <div className="row-sm">
            <Button
              variant="ghost"
              onClick={formBuilder.undo}
              disabled={!formBuilder.canUndo}
            >
              ↶ Undo
            </Button>
            <Button
              variant="ghost"
              onClick={formBuilder.redo}
              disabled={!formBuilder.canRedo}
            >
              ↷ Redo
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              const json = formBuilder.exportToJSON();
              console.log('Exported form:', json);
              navigator.clipboard.writeText(json);
            }}
          >
            📋 Export JSON
          </Button>
        </div>

        <p className="text-xs text-muted">
          Keyboard shortcuts: Cmd+Z (undo), Cmd+Shift+Z (redo)
        </p>
      </section>

      {/* Main content */}
      <section className="stack-lg">
        {state.mode === 'edit' ? (
          <div className="grid grid-cols-2 gap-lg">
            <FieldList />
            <FieldEditor />
          </div>
        ) : (
          <FormPreview />
        )}
      </section>

      {/* Concepts */}
      <section className="stack-md">
        <h2>Key Concepts</h2>
        <div className="stack-xs text-small text-muted">
          <p>
            • <strong>Nested state updates:</strong> Each field is an object
            within an array, demonstrating how to update deeply nested state
          </p>
          <p>
            • <strong>Array manipulations:</strong> Add, remove, and reorder
            fields in the array
          </p>
          <p>
            • <strong>History management:</strong> Full undo/redo stack
            implemented in the Bloc
          </p>
          <p>
            • <strong>Computed validation:</strong> The{' '}
            <code>previewErrors</code> getter validates all fields without
            manual optimization
          </p>
          <p>
            • <strong>Mode switching:</strong> Edit and preview modes share the
            same state
          </p>
        </div>
      </section>
    </ExampleLayout>
  );
}
