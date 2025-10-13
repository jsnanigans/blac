/**
 * Shared Demo Components
 *
 * Export all shared components used across demos
 */

export { StateViewer } from './StateViewer';
export type { StateViewerProps } from './StateViewer';

export {
  ConceptCallout,
  TipCallout,
  WarningCallout,
  SuccessCallout,
  InfoCallout,
  DangerCallout,
} from './ConceptCallout';
export type { ConceptCalloutProps, ConceptCalloutType } from './ConceptCallout';

export { ComparisonPanel } from './ComparisonPanel';
export type {
  ComparisonPanelProps,
  ComparisonSideProps,
  ComparisonColor,
  ComparisonOrientation,
} from './ComparisonPanel';

export {
  InteractionFeedback,
  useInteractionFeedback,
  celebrations,
} from './InteractionFeedback';
export type {
  InteractionFeedbackProps,
  FeedbackType,
  FeedbackTrigger,
} from './InteractionFeedback';
