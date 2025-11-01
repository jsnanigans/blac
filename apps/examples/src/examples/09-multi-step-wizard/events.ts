import { BaseEvent } from '@blac/core';
import type { WizardData } from './types';

// Navigation events
export class NextStepEvent implements BaseEvent {
  readonly type = 'NEXT_STEP' as const;
  readonly timestamp = Date.now();
}

export class PreviousStepEvent implements BaseEvent {
  readonly type = 'PREVIOUS_STEP' as const;
  readonly timestamp = Date.now();
}

export class JumpToStepEvent implements BaseEvent {
  readonly type = 'JUMP_TO_STEP' as const;
  readonly timestamp = Date.now();

  constructor(public readonly stepIndex: number) {}
}

// Data update events
export class UpdateDataEvent implements BaseEvent {
  readonly type = 'UPDATE_DATA' as const;
  readonly timestamp = Date.now();

  constructor(public readonly updates: Partial<WizardData>) {}
}

// Submission events
export class SubmitWizardEvent implements BaseEvent {
  readonly type = 'SUBMIT_WIZARD' as const;
  readonly timestamp = Date.now();
}

// Save/Resume events
export class SaveDraftEvent implements BaseEvent {
  readonly type = 'SAVE_DRAFT' as const;
  readonly timestamp = Date.now();
}

export class ResumeDraftEvent implements BaseEvent {
  readonly type = 'RESUME_DRAFT' as const;
  readonly timestamp = Date.now();
}

export class ResetWizardEvent implements BaseEvent {
  readonly type = 'RESET_WIZARD' as const;
  readonly timestamp = Date.now();
}
