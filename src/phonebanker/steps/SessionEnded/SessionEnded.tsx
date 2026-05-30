import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/shared/Button/Button';
import './SessionEnded.css';

export function SessionEnded() {
  const navigate = useNavigate();

  return (
    <section className="session-ended">
      <header className="session-ended-header">
        <h1 className="session-ended-heading">Session ended</h1>
      </header>

      <p className="session-ended-body">
        This phonebanking session has finished or the link has expired. Your
        organiser may have ended the session, or it may have timed out after
        two hours of inactivity.
      </p>

      <p className="session-ended-body">
        If you think this is a mistake, ask your organiser whether a new session
        is running.
      </p>

      <div className="session-ended-actions">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => navigate({ to: '/' })}
        >
          Back to start
        </Button>
      </div>
    </section>
  );
}
