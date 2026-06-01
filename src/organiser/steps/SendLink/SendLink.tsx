/**
 * Figma: https://www.figma.com/design/2bSUA8wuI0nY6E3eN0Cesd/Phonebanker?node-id=0-176&m=dev
 */
import { useMemo, useState } from 'react';
import { Button } from '@/shared/Button/Button';
import { apiFetch } from '@/shared/api/apiFetch';
import { SessionSchema, type Session } from '@/session/sessionSchema';
import { renderMarkdown } from '../../markdown';
import { interpolate } from '../../template';
import { useOrganiserStore } from '../../organiserStore';
import './SendLink.css';

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; session: Session }
  | { kind: 'error'; message: string };

function buildJoinUrl(sessionId: string): string {
  return `${window.location.origin}/session/${sessionId}`;
}

export const SendLink = () => {
  const organiserName = useOrganiserStore((s) => s.organiserName);
  const phonebankBatch = useOrganiserStore((s) => s.phonebankBatch);
  const callScript = useOrganiserStore((s) => s.callScript);
  const smsMessage = useOrganiserStore((s) => s.smsMessage);
  const goBack = useOrganiserStore((s) => s.goBack);
  const reset = useOrganiserStore((s) => s.reset);

  const [state, setState] = useState<SubmitState>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);

  const scriptHtml = useMemo(() => renderMarkdown(callScript), [callScript]);
  const messageHtml = useMemo(
    () => renderMarkdown(interpolate(smsMessage, {})),
    [smsMessage],
  );

  async function submit() {
    if (!phonebankBatch) return;
    setState({ kind: 'submitting' });
    try {
      const session = await apiFetch('/sessions', SessionSchema, {
        method: 'POST',
        body: JSON.stringify({
          organiserName,
          phonebankBatch,
          callScript,
          smsMessage,
        }),
      });
      setState({ kind: 'success', session });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ kind: 'error', message });
    }
  }

  async function copyJoinLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const isSuccess = state.kind === 'success';
  const isSubmitting = state.kind === 'submitting';
  const joinUrl = isSuccess ? buildJoinUrl(state.session.id) : null;

  return (
    <section className="send-link">
      <header>
        <h1 className="step-heading">{isSuccess ? 'Ready to phonebank!' : 'Ready to share?'}</h1>
        {!isSuccess && (
          <p className="step-subhead">Have a last look. You can still go back and edit anything.</p>
        )}
      </header>

      <div className="review-card">
        <div className="review-section">
          <h2 className="review-title">{phonebankBatch || 'No batch selected'}</h2>
        </div>
        <div className="review-section">
          <span className="review-label">Script</span>
          <div className="review-body" dangerouslySetInnerHTML={{ __html: scriptHtml }} />
        </div>
        <div className="review-section">
          <span className="review-label">Message</span>
          <div className="review-body" dangerouslySetInnerHTML={{ __html: messageHtml }} />
        </div>
      </div>

      <div className="share-callout">
        {isSuccess && joinUrl ? (
          <>
            <span className="share-heading">Share this link</span>
            <div className="share-url">
              <code>{joinUrl}</code>
            </div>
            <Button variant="primary" fullWidth onClick={() => copyJoinLink(joinUrl)}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => window.open(joinUrl, '_blank', 'noopener')}
            >
              Open
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            fullWidth
            disabled={!phonebankBatch || isSubmitting}
            onClick={submit}
          >
            {isSubmitting ? 'Creating…' : 'Submit session'}
          </Button>
        )}
      </div>

      {isSuccess && (
        <p className="share-note">
          Share this link in your WhatsApp group. Anyone with the link can join — no password needed.
        </p>
      )}

      {state.kind === 'error' && (
        <p className="error">Couldn't create the session — {state.message}. Have another go.</p>
      )}

      <div className="actions-back">
        {isSuccess ? (
          <Button variant="link" onClick={reset}>
            Start another session
          </Button>
        ) : (
          <Button variant="link" onClick={goBack} disabled={isSubmitting}>
            Back
          </Button>
        )}
      </div>
    </section>
  );
};
