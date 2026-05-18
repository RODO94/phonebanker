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
  const selectedView = useOrganiserStore((s) => s.selectedView);
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
    if (!selectedView) return;
    setState({ kind: 'submitting' });
    try {
      const session = await apiFetch('/sessions', SessionSchema, {
        method: 'POST',
        body: JSON.stringify({
          viewId: selectedView.id,
          viewName: selectedView.name,
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

  function startAnother() {
    reset();
  }

  if (state.kind === 'success') {
    const joinUrl = buildJoinUrl(state.session.id);
    return (
      <section className="send-link">
        <header>
          <h1 className="step-heading">Your session is live</h1>
          <p className="step-subhead">
            Share this link with your phonebankers. They'll search for themselves to join.
          </p>
        </header>

        <div className="join-link">
          <span className="review-label">Join link</span>
          <div className="join-link-url">
            <code>{joinUrl}</code>
          </div>
          <div className="actions">
            <Button variant="primary" onClick={() => copyJoinLink(joinUrl)}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button variant="secondary" onClick={startAnother}>
              Start another session
            </Button>
          </div>
          {copied && <span className="copy-status">Link copied to clipboard.</span>}
        </div>
      </section>
    );
  }

  return (
    <section className="send-link">
      <header>
        <h1 className="step-heading">Ready to share?</h1>
        <p className="step-subhead">
          Have a last look. You can still go back and edit anything.
        </p>
      </header>

      <div className="review">
        <div className="review-card">
          <span className="review-label">Contact list</span>
          <span className="review-value">{selectedView?.name ?? '—'}</span>
        </div>

        <div className="review-card">
          <span className="review-label">Call script</span>
          <div
            className="review-body"
            dangerouslySetInnerHTML={{ __html: scriptHtml }}
          />
        </div>

        <div className="review-card">
          <span className="review-label">Voicemail / SMS message</span>
          <div
            className="review-body"
            dangerouslySetInnerHTML={{ __html: messageHtml }}
          />
        </div>
      </div>

      {state.kind === 'error' && (
        <p className="error">
          Couldn't create the session — {state.message}. Have another go.
        </p>
      )}

      <div className="actions">
        <Button variant="secondary" onClick={goBack} disabled={state.kind === 'submitting'}>
          Back
        </Button>
        <Button
          variant="primary"
          disabled={!selectedView || state.kind === 'submitting'}
          onClick={submit}
        >
          {state.kind === 'submitting' ? 'Creating…' : 'Submit session'}
        </Button>
      </div>
    </section>
  );
};
