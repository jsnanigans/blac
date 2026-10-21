import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { blacTestSetup } from '@blac/core/testing';
import { AsyncResourcesDemo } from './AsyncResourcesDemo';

blacTestSetup();
afterEach(() => vi.useRealTimers());

const settle = () => act(() => vi.advanceTimersByTimeAsync(600));

describe('AsyncResourcesDemo', () => {
  it('loads on mount, and a rename reloads the activity feed by tag', async () => {
    vi.useFakeTimers();
    render(<AsyncResourcesDemo />);
    await settle();
    expect(screen.getByText('Account created')).toBeTruthy();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Alicia' },
    });
    fireEvent.click(screen.getByText('Rename'));
    await settle();
    await settle();

    expect(screen.getByText('Renamed to Alicia')).toBeTruthy();
  });
});
