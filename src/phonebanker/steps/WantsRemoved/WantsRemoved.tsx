import { useState } from 'react';
import { usePhonebankerStore } from '../../phonebankerStore';
import { apiFetch } from '@/shared/api/apiFetch';
import { Button } from '@/shared/Button/Button';
import { OkResponseSchema } from '@/contact/outcomeSchema';
import { ClaimResultSchema } from '@/contact/contactSchema';
import './WantsRemoved.css';

export function WantsRemoved() {
  const sessionId = usePhonebankerStore((s) => s.sessionId);
  const participantId = usePhonebankerStore((s) => s.participantId);
  const currentContact = usePhonebankerStore((s) => s.currentContact);
  const setStep = usePhonebankerStore((s) => s.setStep);
  const setCurrentContact = usePhonebankerStore((s) => s.setCurrentContact);
  const setLastOutcome = usePhonebankerStore((s) => s.setLastOutcome);

  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = { 'X-Participant-Id': participantId ?? '' };

  const handleConfirm = async () => {
    if (!currentContact) return;
    setLogging(true);
    setError(null);
    try {
      await apiFetch(`/sessions/${sessionId}/log`, OkResponseSchema, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contactId: currentContact.id,
          outcome: 'wants-removed',
        }),
      });

      const result = await apiFetch(
        `/sessions/${sessionId}/next`,
        ClaimResultSchema,
        { method: 'POST', headers },
      );

      setLastOutcome(null);
      if (result.kind === 'claimed') {
        setCurrentContact(result.contact);
        setStep('assigned');
      } else {
        setStep('done');
      }
    } catch {
      setError('Failed to log. Please try again.');
      setLogging(false);
    }
  };

  const handleBack = () => {
    setLastOutcome(null);
    setStep('assigned');
  };

  if (!currentContact) {
    return (
      <div className="wants-removed">
        <p className="wants-removed-loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="wants-removed">
      <header className="wants-removed-header">
        <h2 className="wants-removed-name">{currentContact.name}</h2>
      </header>

      <p className="wants-removed-confirm">
        Mark {currentContact.name} as wanting to be removed?
      </p>

      <p className="wants-removed-explanation">
        An organiser will update their contact preferences
        tomorrow. They won't be called again until then.
      </p>

      {error && (
        <p className="wants-removed-error" role="alert">
          {error}
        </p>
      )}

      <div className="wants-removed-actions">
        <Button
          variant="primary"
          fullWidth
          disabled={logging}
          onClick={handleConfirm}
        >
          Yes, log it
        </Button>
      </div>

      <div className="wants-removed-back">
        <Button
          variant="link"
          disabled={logging}
          onClick={handleBack}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
