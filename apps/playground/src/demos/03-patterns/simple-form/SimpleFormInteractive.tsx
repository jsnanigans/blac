import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { motion } from 'framer-motion';
import { useState } from 'react';
import confetti from 'canvas-confetti';

// ============= Simple Contact Form State & Cubit =============
interface ContactFormState {
  name: string;
  email: string;
  message: string;
  isSubmitting: boolean;
  submitCount: number;
}

class ContactFormCubit extends Cubit<ContactFormState> {
  constructor() {
    super({
      name: '',
      email: '',
      message: '',
      isSubmitting: false,
      submitCount: 0,
    });
  }

  // Computed properties
  get isEmpty(): boolean {
    return !this.state.name && !this.state.email && !this.state.message;
  }

  get canSubmit(): boolean {
    return this.state.name.length > 0 &&
           this.state.email.length > 0 &&
           this.state.message.length > 0 &&
           !this.state.isSubmitting;
  }

  // State update methods
  updateName = (name: string) => {
    this.patch({ name });
  };

  updateEmail = (email: string) => {
    this.patch({ email });
  };

  updateMessage = (message: string) => {
    this.patch({ message });
  };

  submit = async () => {
    if (!this.canSubmit) return;

    this.patch({ isSubmitting: true });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    this.patch({
      isSubmitting: false,
      submitCount: this.state.submitCount + 1,
    });
  };

  reset = () => {
    this.emit({
      name: '',
      email: '',
      message: '',
      isSubmitting: false,
      submitCount: this.state.submitCount,
    });
  };
}

// ============= Newsletter Form =============
interface NewsletterState {
  email: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  interests: string[];
  agreeToTerms: boolean;
  isSubmitting: boolean;
  submitCount: number;
}

class NewsletterCubit extends Cubit<NewsletterState> {
  constructor() {
    super({
      email: '',
      frequency: 'weekly',
      interests: [],
      agreeToTerms: false,
      isSubmitting: false,
      submitCount: 0,
    });
  }

  get canSubmit(): boolean {
    return this.state.email.includes('@') &&
           this.state.agreeToTerms &&
           !this.state.isSubmitting;
  }

  updateEmail = (email: string) => {
    this.patch({ email });
  };

  updateFrequency = (frequency: 'daily' | 'weekly' | 'monthly') => {
    this.patch({ frequency });
  };

  toggleInterest = (interest: string) => {
    const interests = this.state.interests.includes(interest)
      ? this.state.interests.filter(i => i !== interest)
      : [...this.state.interests, interest];
    this.patch({ interests });
  };

  toggleTerms = () => {
    this.patch({ agreeToTerms: !this.state.agreeToTerms });
  };

  submit = async () => {
    if (!this.canSubmit) return;

    this.patch({ isSubmitting: true });
    await new Promise(resolve => setTimeout(resolve, 1500));

    this.patch({
      isSubmitting: false,
      submitCount: this.state.submitCount + 1,
    });
  };

  reset = () => {
    this.emit({
      email: '',
      frequency: 'weekly',
      interests: [],
      agreeToTerms: false,
      isSubmitting: false,
      submitCount: this.state.submitCount,
    });
  };
}

// ============= Interactive Components =============
function ContactFormDemo() {
  const [state, cubit] = useBloc(ContactFormCubit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await cubit.submit();
    if (state.submitCount === 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={state.name}
            onChange={(e) => cubit.updateName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={state.email}
            onChange={(e) => cubit.updateEmail(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            value={state.message}
            onChange={(e) => cubit.updateMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="Your message here..."
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={!cubit.canSubmit}
          >
            {state.isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => cubit.reset()}
            disabled={cubit.isEmpty}
          >
            Reset
          </Button>
        </div>

        {state.submitCount > 0 && !state.isSubmitting && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md"
          >
            Form submitted successfully! (Count: {state.submitCount})
          </motion.div>
        )}
      </form>
    </div>
  );
}

function NewsletterFormDemo() {
  const [state, cubit] = useBloc(NewsletterCubit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await cubit.submit();
  };

  const availableInterests = ['Tech', 'Design', 'Business', 'Marketing'];

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={state.email}
            onChange={(e) => cubit.updateEmail(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Frequency</label>
          <div className="flex gap-3">
            {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
              <label key={freq} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="frequency"
                  checked={state.frequency === freq}
                  onChange={() => cubit.updateFrequency(freq)}
                  className="cursor-pointer"
                />
                <span className="capitalize">{freq}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Interests</label>
          <div className="flex flex-wrap gap-2">
            {availableInterests.map((interest) => (
              <label
                key={interest}
                className={`px-3 py-1 rounded-full cursor-pointer transition-colors ${
                  state.interests.includes(interest)
                    ? 'bg-brand text-white'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <input
                  type="checkbox"
                  checked={state.interests.includes(interest)}
                  onChange={() => cubit.toggleInterest(interest)}
                  className="sr-only"
                />
                {interest}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.agreeToTerms}
              onChange={() => cubit.toggleTerms()}
              className="mt-1 cursor-pointer"
            />
            <span className="text-sm">
              I agree to receive newsletters and accept the terms of service
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={!cubit.canSubmit}
          >
            {state.isSubmitting ? 'Subscribing...' : 'Subscribe'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => cubit.reset()}
          >
            Reset
          </Button>
        </div>

        {state.submitCount > 0 && !state.isSubmitting && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md"
          >
            Successfully subscribed! Check your email.
          </motion.div>
        )}
      </form>
    </div>
  );
}

// ============= Main Interactive Component for MDX =============
export function SimpleFormInteractive() {
  const [activeDemo, setActiveDemo] = useState<'contact' | 'newsletter'>('contact');

  return (
    <div className="my-8 space-y-6">
      {/* Demo Switcher */}
      <div className="flex justify-center gap-3">
        <Button
          onClick={() => setActiveDemo('contact')}
          variant={activeDemo === 'contact' ? 'primary' : 'outline'}
          size="sm"
        >
          Contact Form
        </Button>
        <Button
          onClick={() => setActiveDemo('newsletter')}
          variant={activeDemo === 'newsletter' ? 'primary' : 'outline'}
          size="sm"
        >
          Newsletter Form
        </Button>
      </div>

      {/* Demo Content */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
          <div className="relative">
            <h3 className="text-lg font-semibold mb-4">
              {activeDemo === 'contact' ? 'Contact Form' : 'Newsletter Signup'}
            </h3>
            {activeDemo === 'contact' ? <ContactFormDemo /> : <NewsletterFormDemo />}
          </div>
        </div>

        <div className="space-y-4">
          <StateViewer
            bloc={activeDemo === 'contact' ? ContactFormCubit : NewsletterCubit}
            title={`${activeDemo === 'contact' ? 'Contact' : 'Newsletter'} Form State`}
            defaultCollapsed={false}
          />
        </div>
      </div>
    </div>
  );
}
