/**
 * Registry module (deprecated)
 *
 * Registry functionality has been consolidated into StateContainer.
 * Use StateContainer static methods instead:
 *
 * - StateContainer.register() - Register a type
 * - StateContainer.getOrCreate() - Get or create instance
 * - StateContainer.isRegistered() - Check if type is registered
 * - StateContainer.hasInstance() - Check if instance exists
 * - StateContainer.removeInstance() - Remove instance
 * - StateContainer.getAll() - Get all instances of a type
 * - StateContainer.clear() - Clear all instances of a type
 * - StateContainer.clearAllInstances() - Clear all instances
 * - StateContainer.unregister() - Unregister a type
 * - StateContainer.getStats() - Get statistics
 */

// Re-export types for backwards compatibility
export { type BlocConstructor } from '../types/utilities';
export {
  type InstanceId,
  instanceId as createInstanceId,
} from '../types/branded';
