import { Button } from '@/shared/Button/Button';
import { usePhonebankerStore } from '../../phonebankerStore';
import './AlreadyJoined.css';

export function AlreadyJoined() {
  const displayName = usePhonebankerStore((s) => s.displayName);
  const setStep = usePhonebankerStore((s) => s.setStep);

  return (
    <section className="already-joined">
      <header className="already-joined-header">
        <h1 className="already-joined-heading">You're already in</h1>
        <p className="already-joined-subhead">
          {displayName
            ? `${displayName}, you're already joined to this session.`
            : "You're already joined to this session."}
        </p>
      </header>

      <p className="already-joined-body">
        This happens when you open the link on another device, or your browser
        tab was restored. Your spot in the call list is still yours — pick up
        right where you left off.
      </p>

      <div className="already-joined-actions">
        <Button variant="primary" fullWidth onClick={() => setStep('assigned')}>
          Continue
        </Button>
      </div>
    </section>
  );
}
