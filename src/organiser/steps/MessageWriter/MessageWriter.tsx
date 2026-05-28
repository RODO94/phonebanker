/**
 * Figma: https://www.figma.com/design/2bSUA8wuI0nY6E3eN0Cesd/Phonebanker?node-id=0-150&m=dev
 */
import { useMemo, useRef } from 'react';
import { Button } from '@/shared/Button/Button';
import { Textarea } from '@/shared/Textarea/Textarea';
import { renderMarkdown } from '../../markdown';
import { useOrganiserStore } from '../../organiserStore';
import {
  TEMPLATE_VARIABLES,
  interpolate,
  variableToken,
  type TemplateVariable,
} from '../../template';
import './MessageWriter.css';

const VARIABLE_LABELS: Record<TemplateVariable, string> = {
  contactName: 'Insert contact name',
  phonebankerName: 'Insert your name',
};

const SOFT_LIMIT = 300;

export const MessageWriter = () => {
  const smsMessage = useOrganiserStore((s) => s.smsMessage);
  const setSmsMessage = useOrganiserStore((s) => s.setSmsMessage);
  const goNext = useOrganiserStore((s) => s.goNext);
  const goBack = useOrganiserStore((s) => s.goBack);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const previewHtml = useMemo(
    () => renderMarkdown(interpolate(smsMessage, {})),
    [smsMessage],
  );
  const canContinue = smsMessage.trim().length > 0;
  const charCount = smsMessage.length;
  const overLimit = charCount > SOFT_LIMIT;

  function insertVariable(variable: TemplateVariable) {
    const token = variableToken(variable);
    const el = textareaRef.current;
    if (!el) {
      setSmsMessage(smsMessage + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = smsMessage.slice(0, start) + token + smsMessage.slice(end);
    setSmsMessage(next);
    queueMicrotask(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <section className="message-writer">
      <header>
        <h1 className="step-heading">What's the message if they don't pick up?</h1>
        <p className="step-subhead">
          This is what volunteers will copy into WhatsApp or read as a voicemail. Keep it conversational
          and under ~{SOFT_LIMIT} characters.
        </p>
      </header>

      <div className="editor">
        <Textarea
          ref={textareaRef}
          id="sms-message"
          label="Message"
          value={smsMessage}
          onChange={setSmsMessage}
          placeholder="Hi {contactName}, this is {phonebankerName} from LRU…"
        />
        <span className={`char-count${overLimit ? ' over-limit' : ''}`}>
          {charCount} characters
        </span>
        <div className="variables">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v}
              type="button"
              className="variable-chip"
              onClick={() => insertVariable(v)}
            >
              {VARIABLE_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      <div className="preview-wrap">
        <span className="preview-label">Preview</span>
        <div className="preview" aria-live="polite">
          <div className="preview-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
        <p className="preview-note">
          {'{contactName}'} and {'{phonebankerName}'} are replaced with real names when the message
          goes out.
        </p>
      </div>

      <div className="actions">
        <Button variant="primary" fullWidth disabled={!canContinue} onClick={goNext}>
          Continue
        </Button>
        <div className="actions-back">
          <Button variant="link" onClick={goBack}>
            Back
          </Button>
        </div>
      </div>
    </section>
  );
};
