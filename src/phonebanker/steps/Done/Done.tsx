import { usePhonebankerStore } from '../../phonebankerStore';
import { Button } from '@/shared/Button/Button';
import './Done.css';

export function Done() {
  const displayName = usePhonebankerStore((s) => s.displayName);
  const total = usePhonebankerStore((s) => s.total);
  const called = usePhonebankerStore((s) => s.called);
  const reset = usePhonebankerStore((s) => s.reset);

  return (
    <div className="done">
      <header className="done-header">
        <h2 className="done-title">
          That&rsquo;s the whole list.
        </h2>
        <p className="done-subtitle">
          Thank you, {displayName ?? 'volunteer'}.
        </p>
      </header>

      <dl className="done-stats">
        <div className="done-stat">
          <dt className="done-stat-label">Total calls</dt>
          <dd className="done-stat-value">{called}</dd>
        </div>
        <div className="done-stat">
          <dt className="done-stat-label">Remaining</dt>
          <dd className="done-stat-value">{total - called}</dd>
        </div>
      </dl>

      <div className="done-actions">
        <Button variant="primary" fullWidth onClick={reset}>
          Done
        </Button>
      </div>

      <p className="done-handoff">
        Stay on the Zoom for the debrief.
      </p>
    </div>
  );
}
