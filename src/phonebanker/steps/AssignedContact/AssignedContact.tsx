import { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import { usePhonebankerStore } from '../../phonebankerStore';
import { apiFetch } from '@/shared/api/apiFetch';
import { Button } from '@/shared/Button/Button';
import { CheckIcon, CrossIcon, NoEntryIcon, PhoneIcon } from './OutcomeIcons';
import { OkResponseSchema } from '@/contact/outcomeSchema';
import { ClaimResultSchema } from '@/contact/contactSchema';
import { SessionStateResponseSchema } from '@/session/sessionStateSchema';
import './AssignedContact.css';

type TransitionState =
  | { kind: 'idle' }
  | { kind: 'logging'; name: string }
  | { kind: 'error'; message: string; retry: () => void };

export function AssignedContact() {
  const sessionId = usePhonebankerStore((s) => s.sessionId);
  const participantId = usePhonebankerStore((s) => s.participantId);
  const currentContact = usePhonebankerStore((s) => s.currentContact);
  const session = usePhonebankerStore((s) => s.session);
  const setStep = usePhonebankerStore((s) => s.setStep);
  const setCurrentContact = usePhonebankerStore((s) => s.setCurrentContact);
  const setProgress = usePhonebankerStore((s) => s.setProgress);
  const setLastOutcome = usePhonebankerStore((s) => s.setLastOutcome);

  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [transition, setTransition] = useState<TransitionState>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const currentContactRef = useRef(currentContact);
  currentContactRef.current = currentContact;

  const headers = useCallback(
    (): Record<string, string> => ({ 'X-Participant-Id': participantId ?? '' }),
    [participantId],
  );

  // Handles /next → setCurrentContact or setStep('done').
  // Shared by happy paths (had-conversation, skip) and poll-triggered
  // idle→reclaim path.
  const fetchNext = useCallback(
    async (nameForTransition: string) => {
      setTransition({ kind: 'logging', name: nameForTransition });
      try {
        const result = await apiFetch(
          `/sessions/${sessionId}/next`,
          ClaimResultSchema,
          { method: 'POST', headers: headers() },
        );
        if (result.kind === 'claimed') {
          setCurrentContact(result.contact);
          setTransition({ kind: 'idle' });
        } else {
          setStep('done');
        }
      } catch {
        setTransition({
          kind: 'error',
          message: 'Failed to get next contact. Please try again.',
          retry: () => fetchNext(nameForTransition),
        });
      }
    },
    [sessionId, headers, setCurrentContact, setStep],
  );

  // Poll session state every 10 s.
  useEffect(() => {
    const poll = async () => {
      try {
        const state = await apiFetch(
          `/sessions/${sessionId}/state`,
          SessionStateResponseSchema,
          { headers: headers() },
        );

        if (state.claim.kind === 'exhausted') {
          setStep('done');
          return;
        }

        setProgress(state.progress.total, state.progress.called);

        // Claim timed out while we were displaying a contact.
        // Transparently reclaim the next contact.
        if (state.claim.kind === 'idle' && currentContactRef.current) {
          setCurrentContact(null);
          fetchNext(currentContactRef.current.name);
        }
      } catch {
        // Silently ignore — next poll retries.
      }
    };

    pollRef.current = setInterval(poll, 10_000);
    return () => clearInterval(pollRef.current);
  }, [sessionId, headers, setStep, setProgress, setCurrentContact, fetchNext]);

  // ----  Outcome handlers  ------------------------------------------------

  const handleHadConversation = useCallback(async () => {
    if (!currentContact) return;
    try {
      await apiFetch(`/sessions/${sessionId}/log`, OkResponseSchema, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          contactId: currentContact.id,
          outcome: 'had-conversation',
        }),
      });
      await fetchNext(currentContact.name);
    } catch {
      setTransition({
        kind: 'error',
        message: 'Failed to log the conversation. Tap to retry.',
        retry: handleHadConversation,
      });
    }
  }, [currentContact, sessionId, headers, fetchNext]);

  const handleNoAnswer = useCallback(() => {
    setLastOutcome('no-answer');
    setStep('noAnswerFollowUp');
  }, [setLastOutcome, setStep]);

  const handleWantsRemoved = useCallback(() => {
    setLastOutcome('wants-removed');
    setStep('wantsRemoved');
  }, [setLastOutcome, setStep]);

  const handleSkip = useCallback(async () => {
    if (!currentContact) return;
    try {
      await apiFetch(`/sessions/${sessionId}/skip`, OkResponseSchema, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ contactId: currentContact.id }),
      });
      await fetchNext(currentContact.name);
    } catch {
      setTransition({
        kind: 'error',
        message: 'Failed to skip. Tap to retry.',
        retry: handleSkip,
      });
    }
  }, [currentContact, sessionId, headers, fetchNext]);

  const copySms = useCallback(async () => {
    if (!session) return;
    // the sms message needs to populate the contact name and phone banker name
    // this can come from the session object and the phone banker name can come from the phone banker store
    // the variables are {contactName, phonebankerName}
    try {
      await navigator.clipboard.writeText(session.smsMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Clipboard unavailable — no-op.
    }
  }, [session]);

  // ----  Render branches  -------------------------------------------------

  if (!currentContact || !session) {
    return (
      <div className="assigned-contact">
        <p className="assigned-contact-loading">Loading contact…</p>
      </div>
    );
  }

  const scriptHtml = marked.parse(session.callScript) as string;

  return (
    <div className="assigned-contact">
      {transition.kind !== 'idle' && (
        <div className="assigned-contact-overlay" role="alert">
          {transition.kind === 'logging' && (
            <p className="assigned-contact-transition">
              Logging {transition.name}…
              <br />
              Finding next contact
            </p>
          )}
          {transition.kind === 'error' && (
            <div className="assigned-contact-error">
              <p>{transition.message}</p>
              <Button variant="primary" onClick={transition.retry}>
                Retry
              </Button>
            </div>
          )}
        </div>
      )}

      <header className="assigned-contact-header">
        <h2 className="assigned-contact-name">{currentContact.name}</h2>
        <a
          className="assigned-contact-phone"
          href={`tel:${currentContact.phoneNumber}`}
        >
          <span className="assigned-contact-phone-icon" aria-hidden="true">
            <PhoneIcon />
          </span>
          {currentContact.phoneNumber}
        </a>
      </header>

      <div className="assigned-contact-meta">
        {currentContact.contactType && (
          <span className="assigned-contact-meta-chip">
            {currentContact.contactType}
          </span>
        )}
  
      </div>

      {currentContact.summary && (
        <div className="assigned-contact-summary">
          <p
            className={`assigned-contact-summary-text${summaryExpanded ? ' is-expanded' : ''}`}
          >
            {currentContact.summary}
          </p>
          {currentContact.summary.length > 120 && (
            <button
              className="assigned-contact-summary-toggle"
              type="button"
              onClick={() => setSummaryExpanded((v) => !v)}
            >
              {summaryExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      <div className="assigned-contact-script">
        <h3 className="assigned-contact-script-label">Call script</h3>
        <div
          className="assigned-contact-script-body"
          dangerouslySetInnerHTML={{ __html: scriptHtml }}
        />
      </div>

      <button
        className="assigned-contact-copy"
        type="button"
        onClick={copySms}
      >
        {copied ? 'Copied!' : 'Copy SMS / voicemail'}
      </button>

      <div className="assigned-contact-actions">
        <Button
          variant="positive"
          icon={<CheckIcon />}
          fullWidth
          onClick={handleHadConversation}
          disabled={transition.kind !== 'idle'}
        >
          Had a conversation
        </Button>
        <Button
          variant="neutral"
          icon={<CrossIcon />}
          fullWidth
          onClick={handleNoAnswer}
          disabled={transition.kind !== 'idle'}
        >
          No answer
        </Button>
        <Button
          variant="caution"
          icon={<NoEntryIcon />}
          fullWidth
          onClick={handleWantsRemoved}
          disabled={transition.kind !== 'idle'}
        >
          Wants to be removed
        </Button>
        <Button
          variant="link"
          fullWidth
          onClick={handleSkip}
          disabled={transition.kind !== 'idle'}
        >
          Skip this contact
        </Button>
      </div>
    </div>
  );
}
