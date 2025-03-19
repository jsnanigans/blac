import { Cubit } from 'blac-next';

// Different demos we'll showcase in the interactive blog
export type DemoType = 'counter' | 'theme' | 'form' | 'filter' | 'shared' | 'isolated';

// State for individual counter demos
export interface CounterState {
  value: number;
}

// Theme state
export type ThemeMode = 'light' | 'dark' | 'system';

// Simple form state
export interface FormState {
  name: string;
  email: string;
  message: string;
  submitted: boolean;
}

// Main state for the feature demo
export interface FeatureState {
  activeSection: string;
  counters: Record<string, CounterState>;
  theme: ThemeMode;
  form: FormState;
  expandedSections: Record<string, boolean>;
  activeDemo: DemoType | null;
  codeVisible: boolean;
}

export class FeatureBloc extends Cubit<FeatureState> {
  constructor() {
    super({
      activeSection: 'intro',
      counters: {
        shared1: { value: 0 },
        shared2: { value: 0 },
        isolated1: { value: 0 },
        isolated2: { value: 0 },
      },
      theme: 'light',
      form: {
        name: '',
        email: '',
        message: '',
        submitted: false,
      },
      expandedSections: {
        intro: true,
        directAccess: false,
        props: false,
        computed: false,
        isolated: false,
        performance: false,
      },
      activeDemo: null,
      codeVisible: false,
    });
  }

  // Navigation
  setActiveSection = (section: string) => {
    this.emit({
      ...this.state,
      activeSection: section,
      expandedSections: {
        ...this.state.expandedSections,
        [section]: true,
      }
    });
  };

  toggleSection = (section: string) => {
    this.emit({
      ...this.state,
      expandedSections: {
        ...this.state.expandedSections,
        [section]: !this.state.expandedSections[section],
      }
    });
  };

  // Counter demos
  incrementCounter = (id: string) => {
    const counter = this.state.counters[id];
    if (!counter) return;

    this.emit({
      ...this.state,
      counters: {
        ...this.state.counters,
        [id]: {
          value: counter.value + 1,
        },
      },
    });
  };

  decrementCounter = (id: string) => {
    const counter = this.state.counters[id];
    if (!counter) return;

    this.emit({
      ...this.state,
      counters: {
        ...this.state.counters,
        [id]: {
          value: counter.value - 1,
        },
      },
    });
  };

  resetCounter = (id: string) => {
    this.emit({
      ...this.state,
      counters: {
        ...this.state.counters,
        [id]: { value: 0 },
      },
    });
  };

  // Theme toggling
  setTheme = (theme: ThemeMode) => {
    this.emit({
      ...this.state,
      theme
    });
  };

  toggleTheme = () => {
    const nextTheme = this.state.theme === 'light' ? 'dark' : 'light';
    this.emit({
      ...this.state,
      theme: nextTheme
    });
  };

  // Form handling
  updateForm = (updates: Partial<FormState>) => {
    this.emit({
      ...this.state,
      form: {
        ...this.state.form,
        ...updates,
      },
    });
  };

  submitForm = () => {
    this.emit({
      ...this.state,
      form: {
        ...this.state.form,
        submitted: true,
      },
    });
  };

  resetForm = () => {
    this.emit({
      ...this.state,
      form: {
        name: '',
        email: '',
        message: '',
        submitted: false,
      },
    });
  };

  // Demo selection
  setActiveDemo = (demo: DemoType | null) => {
    this.emit({
      ...this.state,
      activeDemo: demo
    });
  };

  toggleCodeVisibility = () => {
    this.emit({
      ...this.state,
      codeVisible: !this.state.codeVisible
    });
  };

  // Computed properties
  get isFormValid() {
    const { name, email, message } = this.state.form;
    return name.trim() !== '' && email.includes('@') && message.trim() !== '';
  }

  get activeCounters() {
    const counters = { ...this.state.counters };
    // Filter or transform counters based on active demo
    return counters;
  }

  get totalCount() {
    return Object.values(this.state.counters).reduce((sum, counter) => sum + counter.value, 0);
  }
} 