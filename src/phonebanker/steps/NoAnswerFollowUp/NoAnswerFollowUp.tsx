import { useState } from 'react';
import { usePhonebankerStore } from '../../phonebankerStore';
import { apiFetch } from '@/shared/api/apiFetch';
import { Button } from '@/shared/Button/Button';
import { OkResponseSchema } from '@/contact/outcomeSchema';
import { ClaimResultSchema } from '@/contact/contactSchema';
import './NoAnswerFollowUp.css';

export function NoAnswerFollowUp() {
  const sessionId = usePhonebankerStore((s) => s.sessionId);
  const participantId = usePhonebankerStore((s) => s.participantId);
  const currentContact = usePhonebankerStore((s) => s.currentContact);
  const setStep = usePhonebankerStore((s) => s.setStep);
  const setCurrentContact = usePhonebankerStore((s) => s.setCurrentContact);
  const setLastOutcome = usePhonebankerStore((s) => s.setLastOutcome);

  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = { 'X-Participant-Id': participantId ?? '' };

  const handleAnswer = async (messageSent: boolean) => {
    if (!currentContact) return;
    setLogging(true);
    setError(null);
    try {
      await apiFetch(`/sessions/${sessionId}/log`, OkResponseSchema, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contactId: currentContact.id,
          outcome: 'no-answer',
          messageSent,
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
      <div className="no-answer-followup">
        <p className="no-answer-followup-loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="no-answer-followup">
      <header className="no-answer-followup-header">
        <h2 className="no-answer-followup-name">{currentContact.name}</h2>
      </header>

      <p className="no-answer-followup-question">
        Did you send the SMS or leave a voicemail?
      </p>

      {error && (
        <p className="no-answer-followup-error" role="alert">
          {error}
        </p>
      )}

      <div className="no-answer-followup-actions">
        <Button
          variant="primary"
          fullWidth
          disabled={logging}
          onClick={() => handleAnswer(true)}
        >
          Yes, message sent
        </Button>
        <Button
          variant="secondary"
          fullWidth
          disabled={logging}
          onClick={() => handleAnswer(false)}
        >
          No, no message
        </Button>
      </div>

      <div className="no-answer-followup-back">
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
