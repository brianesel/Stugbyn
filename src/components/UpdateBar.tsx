import { usePwaUpdate } from '../pwa';

/** A small bar at the bottom when a new version of the app has been downloaded. */
export function UpdateBar() {
  const { needRefresh, update, dismiss } = usePwaUpdate();
  if (!needRefresh) return null;
  return (
    <div className="update-bar" role="status">
      <span>A new version of Stugbyn is ready.</span>
      <button type="button" className="btn btn-primary" onClick={update}>
        Update
      </button>
      <button type="button" className="btn" onClick={dismiss}>
        Later
      </button>
    </div>
  );
}
