/**
 * Figma: https://www.figma.com/design/2bSUA8wuI0nY6E3eN0Cesd/Phonebanker?node-id=0-108&m=dev
 */
import { useMemo } from 'react';
import { Button } from '@/shared/Button/Button';
import { Textarea } from '@/shared/Textarea/Textarea';
import { renderMarkdown } from '../../markdown';
import { useOrganiserStore } from '../../organiserStore';
import './ScriptWriter.css';

export const ScriptWriter = () => {
  const callScript = useOrganiserStore((s) => s.callScript);
  const setCallScript = useOrganiserStore((s) => s.setCallScript);
  const goNext = useOrganiserStore((s) => s.goNext);
  const goBack = useOrganiserStore((s) => s.goBack);

  const previewHtml = useMemo(() => renderMarkdown(callScript), [callScript]);
  const canContinue = callScript.trim().length > 0;

  return (
    <section className="script-writer">
      <header>
        <h1 className="step-heading">Write your call script</h1>
        <p className="step-subhead">
          What should phonebankers say? Use markdown — **bold**, *italic*, and lists work.
        </p>
      </header>

      <div className="editor">
        <Textarea
          id="call-script"
          label="Script"
          hint="Markdown supported. Keep it short — phonebankers will read it on a small screen."
          value={callScript}
          onChange={setCallScript}
          placeholder="Hi, this is [your name] from London Renters Union…"
        />

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
