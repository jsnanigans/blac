import { describe, it, expect, vi } from 'vite-plus/test';
import { render, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

interface NestedState {
  user: { name: string; email: string };
  profile: { bio: string } | null;
  items: number[];
}

class NestedBloc extends Cubit<NestedState> {
  constructor() {
    super({
      user: { name: 'Ada', email: 'ada@x.io' },
      profile: { bio: 'hi' },
      items: [1, 2, 3],
    });
  }
  setName(name: string) {
    this.patch({ user: { ...this.state.user, name } });
  }
  clearProfile() {
    this.patch({ profile: null });
  }
  addItem() {
    this.patch({ items: [...this.state.items, this.state.items.length + 1] });
  }
}

blacTestSetup();

// Regression: object sibling-leaf isolation under `patch`. Previously every
// consumer expanded its interest to ancestor paths as *normal* ids, which
// collided with `changedPathsFromPatch`'s structural pulse-up of the same
// parent — so changing `user.name` woke `user.email`/`profile.bio` readers too.
// The ancestor-watch lane fixes this while keeping array / wholesale-replacement
// readers waking.
describe('useBloc — nested patch sibling isolation', () => {
  it('changing user.name does NOT re-render a user.email reader', async () => {
    const nameRenders = vi.fn();
    const emailRenders = vi.fn();
    let bloc!: NestedBloc;

    function NameReader() {
      nameRenders();
      const [state, b] = useBloc(NestedBloc);
      bloc = b as NestedBloc;
      return <span>{state.user.name}</span>;
    }
    function EmailReader() {
      emailRenders();
      const [state] = useBloc(NestedBloc);
      return <span>{state.user.email}</span>;
    }
    render(
      <>
        <NameReader />
        <EmailReader />
      </>,
    );
    const emailBefore = emailRenders.mock.calls.length;
    const nameBefore = nameRenders.mock.calls.length;

    await act(async () => {
      bloc.setName('Grace');
    });

    expect(emailRenders.mock.calls.length).toBe(emailBefore); // asleep
    expect(nameRenders.mock.calls.length).toBe(nameBefore + 1); // woke
  });

  it('an items.length reader still wakes when the array is replaced', async () => {
    const lengthRenders = vi.fn();
    const emailRenders = vi.fn();
    let bloc!: NestedBloc;

    function LengthReader() {
      lengthRenders();
      const [state, b] = useBloc(NestedBloc);
      bloc = b as NestedBloc;
      return <span>{state.items.length}</span>;
    }
    function EmailReader() {
      emailRenders();
      const [state] = useBloc(NestedBloc);
      return <span>{state.user.email}</span>;
    }
    render(
      <>
        <LengthReader />
        <EmailReader />
      </>,
    );
    const lengthBefore = lengthRenders.mock.calls.length;
    const emailBefore = emailRenders.mock.calls.length;

    await act(async () => {
      bloc.addItem();
    });

    expect(lengthRenders.mock.calls.length).toBe(lengthBefore + 1); // woke
    expect(emailRenders.mock.calls.length).toBe(emailBefore); // unrelated, asleep
  });

  it('a profile.bio reader wakes when profile is replaced with null', async () => {
    const bioRenders = vi.fn();
    const nameRenders = vi.fn();
    let bloc!: NestedBloc;

    function BioReader() {
      bioRenders();
      const [state, b] = useBloc(NestedBloc);
      bloc = b as NestedBloc;
      return <span>{state.profile?.bio ?? 'none'}</span>;
    }
    function NameReader() {
      nameRenders();
      const [state] = useBloc(NestedBloc);
      return <span>{state.user.name}</span>;
    }
    render(
      <>
        <BioReader />
        <NameReader />
      </>,
    );
    const bioBefore = bioRenders.mock.calls.length;
    const nameBefore = nameRenders.mock.calls.length;

    await act(async () => {
      bloc.clearProfile();
    });

    expect(bioRenders.mock.calls.length).toBe(bioBefore + 1); // woke
    expect(nameRenders.mock.calls.length).toBe(nameBefore); // unrelated, asleep
  });
});
