import { outdatedSides } from './versions';

describe('outdatedSides', () => {
  it('flags the older side', () => {
    expect(outdatedSides('2.0.9', '2.0.25')).toEqual(['agent']);
    expect(outdatedSides('2.0.30', '2.0.25')).toEqual(['panel']);
    expect(outdatedSides(undefined, '2.0.25')).toEqual(['agent']);
  });

  it('flags both when both are behind the latest release', () => {
    expect(outdatedSides('2.0.9', '2.0.25', '2.0.30')).toEqual([
      'agent',
      'panel',
    ]);
    expect(outdatedSides('2.0.9', '2.0.25', '2.0.25')).toEqual(['agent']);
  });

  it('ignores matching and source builds', () => {
    expect(outdatedSides('2.0.25', '2.0.25', '2.0.30')).toEqual([]);
    expect(outdatedSides('dev', '2.0.25')).toEqual([]);
    expect(outdatedSides('2.0.25', 'dev')).toEqual([]);
  });
});
