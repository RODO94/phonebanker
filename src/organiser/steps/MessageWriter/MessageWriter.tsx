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
        <h1 className="step-heading">Write a message to leave</h1>
        <p className="step-subhead">
          Phonebankers will copy this if a call goes to voicemail or they need to send an SMS.
        </p>
      </header>

      <div className="editor">
        <div className="editor-column">
          <Textarea
            ref={textareaRef}
            id="sms-message"
            label="Message"
            hint="Type {contactName} and {phonebankerName} where names should appear, or use the buttons below."
            value={smsMessage}
            onChange={setSmsMessage}
            placeholder="Hi {contactName}, this is {phonebankerName} from LRU…"
          />
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

        <div className="preview" aria-live="polite">
          <span className="preview-label">Preview</span>
          <div
            className="preview-body"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      <div className="actions">
        <Button variant="secondary" onClick={goBack}>
          Back
        </Button>
        <Button variant="primary" disabled={!canContinue} onClick={goNext}>
          Continue
        </Button>
      </div>
    </section>
  );
};
