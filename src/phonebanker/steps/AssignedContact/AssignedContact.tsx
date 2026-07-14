import { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import { usePhonebankerStore } from '../../phonebankerStore';
import { apiFetch } from '@/shared/api/apiFetch';
import { Button } from '@/shared/Button/Button';
import { CheckIcon, ChevronIcon, CrossIcon, NoEntryIcon, PhoneIcon, RefreshIcon } from './OutcomeIcons';
import { OkResponseSchema } from '@/contact/outcomeSchema';
import { ClaimResultSchema } from '@/contact/contactSchema';
import { SessionStateResponseSchema } from '@/session/sessionStateSchema';
import { interpolate } from '@/organiser/template';
import './AssignedContact.css';

type TransitionState =
  | { kind: 'idle' }
  | { kind: 'logging'; name: string }
  | { kind: 'error'; message: string; retry: () => void };

export function AssignedContact() {
  const sessionId = usePhonebankerStore((s) => s.sessionId);
  const participantId = usePhonebankerStore((s) => s.participantId);
  const currentContact = usePhonebankerStore((s) => s.currentContact);
  const displayName = usePhonebankerStore((s) => s.displayName);
  const session = usePhonebankerStore((s) => s.session);
  const setStep = usePhonebankerStore((s) => s.setStep);
  const setCurrentContact = usePhonebankerStore((s) => s.setCurrentContact);
  const setProgress = usePhonebankerStore((s) => s.setProgress);
  const setLastOutcome = usePhonebankerStore((s) => s.setLastOutcome);

  const [notesExpanded, setNotesExpanded] = useState(false);
  const [transition, setTransition] = useState<TransitionState>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  // Reconciles local state against the server's view — progress, and whichever
  // contact this participant currently holds. Two tabs/devices joined under the
  // same participant can drift: one logs an outcome and claims a new contact,
  // but the other's local `currentContact` has no way to hear about it except
  // by asking. Covers all three claim kinds so both the timeout-reclaim path
  // and the "other side moved on" path self-heal the same way. Shared by the
  // background poll and the manual Refresh button.
  const syncState = useCallback(async () => {
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

    if (state.claim.kind === 'idle') {
      // Claim timed out while we were displaying a contact — transparently
      // reclaim the next one.
      if (currentContactRef.current) {
        setCurrentContact(null);
        await fetchNext(currentContactRef.current.name);
      }
      return;
    }

    // state.claim.kind === 'assigned' — sync to whatever contact the server
    // says we're holding, in case it changed on another tab/device.
    if (state.claim.assignment.contact.id !== currentContactRef.current?.id) {
      setCurrentContact(state.claim.assignment.contact);
    }
  }, [sessionId, headers, setStep, setProgress, setCurrentContact, fetchNext]);

  // Poll session state every 10 s.
  useEffect(() => {
    const poll = () => {
      syncState().catch(() => {
        // Silently ignore — next poll retries.
      });
    };

    pollRef.current = setInterval(poll, 10_000);
    return () => clearInterval(pollRef.current);
  }, [syncState]);

  const handleRefresh = useCallback(async () => {
    setSyncing(true);
    try {
      await syncState();
    } catch {
      // Silently ignore — same posture as the background poll.
    } finally {
      setSyncing(false);
    }
  }, [syncState]);

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
    if (!session || !currentContact) return;
    // Substitute {contactName}/{phonebankerName} with the same interpolate the
    // organiser previews against, so the tokens map identically on both sides.
    const message = interpolate(session.smsMessage, {
      contactName: currentContact.name,
      phonebankerName: displayName ?? undefined,
    });
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Clipboard unavailable — no-op.
    }
  }, [session, currentContact, displayName]);

  // ----  Render branches  -------------------------------------------------

  if (!currentContact || !session) {
    return (
      <div className="assigned-contact">
        <p className="assigned-contact-loading">Loading contact…</p>
      </div>
    );
  }

  const scriptHtml = marked.parse(session.callScript) as string;
  const firstName = currentContact.name.split(' ')[0] || currentContact.name;
  const isPayingMember = currentContact.contactType === 'Member (paying)';

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

      {/* Left column on wide screens: who you're calling and what to say.
          The after-the-call actions are the second grid child, below. */}
      <div className="assigned-contact-main">
      {/* Catches this tab up with the server without a page reload — a reload
          would lose participantId (no persistence, by design) and boot the
          phonebanker back to the join screen. Mainly useful when the same
          participant is open on another device and has moved on. */}
      <button
        className="assigned-contact-refresh"
        type="button"
        onClick={handleRefresh}
        disabled={syncing}
      >
        <span
          className={`assigned-contact-refresh-icon${syncing ? ' is-syncing' : ''}`}
          aria-hidden="true"
        >
          <RefreshIcon />
        </span>
        {syncing ? 'Refreshing…' : 'Refresh'}
      </button>

      {/* Identity card — name, standing, and the dial action grouped as the
          one thing the phonebanker acts on first. */}
      <div className="assigned-contact-card">
        <h2 className="assigned-contact-name">{currentContact.name}</h2>

        {currentContact.contactType && (
          <div className="assigned-contact-status">
            <span
              className={`assigned-contact-status-dot${isPayingMember ? ' is-active' : ''}`}
              aria-hidden="true"
            />
            <span className="assigned-contact-status-label">
              {currentContact.contactType}
            </span>
          </div>
        )}

        {currentContact.phoneNumber ? (
          <a
            className="assigned-contact-call"
            href={`tel:${currentContact.phoneNumber}`}
          >
            <span className="assigned-contact-call-icon" aria-hidden="true">
              <PhoneIcon />
            </span>
            <span className="assigned-contact-call-text">
              <span className="assigned-contact-call-name">Call {firstName}</span>
              <span className="assigned-contact-call-number">
                {currentContact.phoneNumber}
              </span>
            </span>
          </a>
        ) : (
          <p className="assigned-contact-no-number">No phone number on file</p>
        )}
      </div>

      <section className="assigned-contact-section">
        <h3 className="assigned-contact-eyebrow">What to say</h3>
        <div
          className="assigned-contact-script"
          dangerouslySetInnerHTML={{ __html: scriptHtml }}
        />
        {displayName && (
          <button
            className="assigned-contact-copy"
            type="button"
            onClick={copySms}
          >
            {copied ? 'Copied!' : 'Copy SMS / voicemail'}
          </button>
        )}
      </section>

      {currentContact.summary && (
        <div className="assigned-contact-notes">
          <button
            className="assigned-contact-notes-toggle"
            type="button"
            aria-expanded={notesExpanded}
            onClick={() => setNotesExpanded((v) => !v)}
          >
            <span>Previous note</span>
            <span
              className={`assigned-contact-notes-chevron${notesExpanded ? ' is-open' : ''}`}
              aria-hidden="true"
            >
              <ChevronIcon />
            </span>
          </button>
          {notesExpanded && (
            <div className="assigned-contact-notes-body">
              <p>{currentContact.summary}</p>
            </div>
          )}
        </div>
      )}
      </div>

      <section className="assigned-contact-section assigned-contact-after">
        <h3 className="assigned-contact-eyebrow">After the call</h3>
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
      </section>
    </div>
  );
}
