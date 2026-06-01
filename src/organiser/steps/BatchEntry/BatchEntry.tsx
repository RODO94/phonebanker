import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/shared/api/apiFetch';
import { Button } from '@/shared/Button/Button';
import { BatchCountSchema } from '@/batch/batchSchema';
import { useOrganiserStore } from '../../organiserStore';
import './BatchEntry.css';

// The count is tied to the exact batch string it was checked against, so editing
// the input after a check invalidates the result — the organiser can't advance on
// a stale count for a batch they've since changed.
type CheckState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'checked'; batch: string; count: number }
  | { kind: 'error'; message: string };

export const BatchEntry = () => {
  const phonebankBatch = useOrganiserStore((s) => s.phonebankBatch);
  const setPhonebankBatch = useOrganiserStore((s) => s.setPhonebankBatch);
  const goNext = useOrganiserStore((s) => s.goNext);

  const [state, setState] = useState<CheckState>({ kind: 'idle' });

  const batch = phonebankBatch.trim();
  const isChecked = state.kind === 'checked' && state.batch === batch;
  const canContinue = isChecked && state.count > 0;

  async function check(e: FormEvent) {
    e.preventDefault();
    if (batch.length === 0) return;
    setState({ kind: 'checking' });
    try {
      const result = await apiFetch('/batches/count', BatchCountSchema, {
        method: 'POST',
        body: JSON.stringify({ batch }),
      });
      setState({ kind: 'checked', batch: result.batch, count: result.count });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ kind: 'error', message });
    }
  }

  return (
    <section className="batch-entry">
      <header>
        <h1 className="step-heading">Who are we calling tonight?</h1>
        <p className="step-subhead">
          Tag the members you want to call in Airtable's “Current Phonebank Batch” field, then enter
          that same batch here. We'll only call the members carrying this tag.
        </p>
      </header>

      <form className="batch-field" onSubmit={check}>
        <label className="batch-label" htmlFor="phonebank-batch">
          Which batch?
        </label>
        <input
          id="phonebank-batch"
          className="batch-input"
          type="text"
          placeholder="e.g. 31-05-2026"
          value={phonebankBatch}
          onChange={(e) => {
            setPhonebankBatch(e.target.value);
            if (state.kind !== 'idle') setState({ kind: 'idle' });
          }}
        />
        <Button
          type="submit"
          variant="secondary"
          fullWidth
          disabled={batch.length === 0 || state.kind === 'checking'}
        >
          {state.kind === 'checking' ? 'Checking…' : 'Check batch'}
        </Button>
      </form>

      {isChecked && state.count > 0 && (
        <p className="batch-result">
          {state.count} {state.count === 1 ? 'member is' : 'members are'} tagged{' '}
          <strong>{state.batch}</strong> — ready to go.
        </p>
      )}
      {isChecked && state.count === 0 && (
        <p className="batch-result batch-result--empty">
          No members carry that batch tag. Check it matches the “Current Phonebank Batch” field in
          Airtable exactly, or tag some records first.
        </p>
      )}
      {state.kind === 'error' && (
        <p className="batch-result batch-result--empty">
          Couldn't check that batch — {state.message}. Try again in a moment, or speak to a fellow
          organiser.
        </p>
      )}

      <div className="actions">
        <Button variant="primary" fullWidth disabled={!canContinue} onClick={goNext}>
          Continue
        </Button>
      </div>
    </section>
  );
};
