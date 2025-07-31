import { BlocPlugin, PluginRegistry, ErrorContext } from './types';

/**
 * Registry for bloc-specific plugins
 */
export class BlocPluginRegistry<TState, TEvent = never>
  implements PluginRegistry<BlocPlugin<TState, TEvent>>
{
  private plugins = new Map<string, BlocPlugin<TState, TEvent>>();
  private executionOrder: string[] = [];
  private attached = false;

  /**
   * Add a bloc plugin
   */
  add(plugin: BlocPlugin<TState, TEvent>): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    // Validate capabilities
    if (plugin.capabilities) {
      this.validateCapabilities(plugin);
    }

    this.plugins.set(plugin.name, plugin);
    this.executionOrder.push(plugin.name);
  }

  /**
   * Remove a bloc plugin
   */
  remove(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return false;

    // Call onDetach if attached
    if (this.attached && plugin.onDetach) {
      try {
        plugin.onDetach();
      } catch (error) {
        console.error(`Plugin '${pluginName}' error in onDetach:`, error);
      }
    }

    this.plugins.delete(pluginName);
    this.executionOrder = this.executionOrder.filter(
      (name) => name !== pluginName,
    );

    return true;
  }

  /**
   * Get a plugin by name
   */
  get(pluginName: string): BlocPlugin<TState, TEvent> | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get all plugins in execution order
   */
  getAll(): ReadonlyArray<BlocPlugin<TState, TEvent>> {
    return this.executionOrder.map((name) => this.plugins.get(name)!);
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    // Detach all plugins first
    if (this.attached) {
      for (const plugin of this.getAll()) {
        if (plugin.onDetach) {
          try {
            plugin.onDetach();
          } catch (error) {
            console.error(`Plugin '${plugin.name}' error in onDetach:`, error);
          }
        }
      }
    }

    this.plugins.clear();
    this.executionOrder = [];
    this.attached = false;
  }

  /**
   * Attach all plugins to a bloc
   */
  attach(bloc: any): void {
    if (this.attached) {
      throw new Error('Plugins are already attached');
    }

    for (const plugin of this.getAll()) {
      if (plugin.onAttach) {
        try {
          plugin.onAttach(bloc);
        } catch (error) {
          console.error(`Plugin '${plugin.name}' error in onAttach:`, error);
          // Remove failing plugin
          this.remove(plugin.name);
        }
      }
    }

    this.attached = true;
  }

  /**
   * Transform state through all plugins
   */
  transformState(previousState: TState, nextState: TState): TState {
    let transformedState = nextState;

    for (const plugin of this.getAll()) {
      if (plugin.transformState && this.canTransformState(plugin)) {
        try {
          transformedState = plugin.transformState(
            previousState,
            transformedState,
          );
        } catch (error) {
          console.error(
            `Plugin '${plugin.name}' error in transformState:`,
            error,
          );
          // Continue with untransformed state
        }
      }
    }

    return transformedState;
  }

  /**
   * Transform event through all plugins
   */
  transformEvent(event: TEvent): TEvent | null {
    let transformedEvent: TEvent | null = event;

    for (const plugin of this.getAll()) {
      if (transformedEvent === null) break;

      if (plugin.transformEvent && this.canInterceptEvents(plugin)) {
        try {
          transformedEvent = plugin.transformEvent(transformedEvent);
        } catch (error) {
          console.error(
            `Plugin '${plugin.name}' error in transformEvent:`,
            error,
          );
          // Continue with untransformed event
        }
      }
    }

    return transformedEvent;
  }

  /**
   * Notify plugins of state change
   */
  notifyStateChange(previousState: TState, currentState: TState): void {
    for (const plugin of this.getAll()) {
      if (plugin.onStateChange && this.canReadState(plugin)) {
        try {
          plugin.onStateChange(previousState, currentState);
        } catch (error) {
          console.error(
            `Plugin '${plugin.name}' error in onStateChange:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Notify plugins of event
   */
  notifyEvent(event: TEvent): void {
    for (const plugin of this.getAll()) {
      if (plugin.onEvent && this.canReadState(plugin)) {
        try {
          plugin.onEvent(event);
        } catch (error) {
          console.error(`Plugin '${plugin.name}' error in onEvent:`, error);
        }
      }
    }
  }

  /**
   * Notify plugins of error
   */
  notifyError(error: Error, context: ErrorContext): void {
    for (const plugin of this.getAll()) {
      if (plugin.onError) {
        try {
          plugin.onError(error, context);
        } catch (hookError) {
          console.error(`Plugin '${plugin.name}' error in onError:`, hookError);
        }
      }
    }
  }

  private validateCapabilities(plugin: BlocPlugin<TState, TEvent>): void {
    const caps = plugin.capabilities!;

    // Validate logical constraints
    if (caps.transformState && !caps.readState) {
      throw new Error(
        `Plugin '${plugin.name}': transformState requires readState capability`,
      );
    }

    if (caps.interceptEvents && !caps.readState) {
      throw new Error(
        `Plugin '${plugin.name}': interceptEvents requires readState capability`,
      );
    }
  }

  private canReadState(plugin: BlocPlugin<TState, TEvent>): boolean {
    return !plugin.capabilities || plugin.capabilities.readState !== false;
  }

  private canTransformState(plugin: BlocPlugin<TState, TEvent>): boolean {
    return !plugin.capabilities || plugin.capabilities.transformState === true;
  }

  private canInterceptEvents(plugin: BlocPlugin<TState, TEvent>): boolean {
    return !plugin.capabilities || plugin.capabilities.interceptEvents === true;
  }
}
