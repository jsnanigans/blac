import { DemoRegistry } from '@/core/utils/demoRegistry';
import { CharacterStatsDemo } from './CharacterStatsDemo';

DemoRegistry.register({
  id: 'schema-validation',
  category: '03-advanced',
  title: 'Schema Validation',
  description:
    'Add runtime type safety and validation to your state using Zod, Valibot, or ArkType. Automatically validate state changes and catch invalid data before it corrupts your application.',
  difficulty: 'intermediate',
  tags: ['validation', 'schema', 'zod', 'type-safety', 'runtime'],
  concepts: [
    'runtime validation',
    'schema validation',
    'Zod integration',
    'Standard Schema',
    'error handling',
    'state integrity',
  ],
  component: CharacterStatsDemo,
  code: {
    demo: '',
  },
  relatedDemos: ['form-validation', 'data-fetching', 'persistence'],
  documentation: `
## Schema Validation with BlaC

BlaC provides built-in support for **runtime state validation** using the Standard Schema specification. This allows you to enforce data integrity and catch invalid state changes before they happen.

### Key Benefits:

1. **Runtime Type Safety**: Validate state at runtime, not just compile time
2. **Business Rules Enforcement**: Ensure constraints like "age must be 0-150" are always met
3. **Better Error Messages**: Get detailed validation errors with paths to problematic fields
4. **Defense Against Bad Data**: Validate data from APIs, localStorage, or user input

### Supported Libraries:

- **Zod**: Full-featured, excellent TypeScript inference
- **Valibot**: Lightweight, modular, tree-shakeable
- **ArkType**: Fast runtime performance, unique syntax

### Basic Usage:

\`\`\`typescript
import { z } from 'zod';
import { Cubit } from '@blac/core';

const CharacterStatsSchema = z.object({
  level: z.number().int().min(1).max(100),
  health: z.number().int().min(0).max(1000),
  mana: z.number().int().min(0).max(500),
  attack: z.number().int().min(1).max(200),
});

type CharacterStats = z.infer<typeof CharacterStatsSchema>;

class CharacterCubit extends Cubit<CharacterStats> {
  static schema = CharacterStatsSchema; // Schema validates all state changes

  constructor() {
    super({ level: 1, health: 100, mana: 50, attack: 10 });
  }

  takeDamage = (amount: number) => {
    // This emit is automatically validated - negative health will be rejected
    this.emit({ ...this.state, health: this.state.health - amount });
  };
}
\`\`\`

### How It Works:

1. Define a schema using Zod, Valibot, or ArkType
2. Add it as a \`static schema\` property on your Cubit/Bloc
3. BlaC validates initial state in constructor
4. Every \`emit()\` validates the new state before updating
5. Invalid changes throw \`BlocValidationError\` and state remains unchanged

### Helper Methods:

- **isValid(value)**: Check if a value is valid (boolean)
- **validate(value)**: Get validation result without throwing
- **parse(value)**: Validate and return value (throws on error)
- **safeParse(value)**: Non-throwing parse with result object

### When to Use:

✅ Validating external data (APIs, localStorage, user input)
✅ Enforcing business rules (price > 0, quantity >= 1)
✅ Complex state with invariants
✅ Preventing data corruption

❌ Simple internal state (counter, toggle)
❌ Performance-critical hot paths
❌ State that's always derived/computed

### Best Practices:

1. Use schema validation for external data sources
2. Validate at the boundaries of your application
3. Keep schemas close to state definitions
4. Use helper methods for pre-validation checks
5. Handle BlocValidationError in try-catch blocks
`,
});
