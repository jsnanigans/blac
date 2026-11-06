import { useBloc } from '@blac/react';
import { SiteCubit } from '../../patchbay/site';

/** "Show renders": outline every blac component in amber when it re-renders. */
export default function FlashToggle() {
  const [{ flash }, site] = useBloc(SiteCubit);
  return (
    <button
      type="button"
      className="flash-toggle"
      aria-pressed={flash}
      onClick={site.toggleFlash}
      title="Outline every BlaC component on the page when it re-renders"
    >
      <span className="flash-led" aria-hidden="true" />
      <span className="flash-label">Show renders</span>
    </button>
  );
}
