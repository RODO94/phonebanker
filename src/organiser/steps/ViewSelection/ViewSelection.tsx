/**
 * Figma: https://www.figma.com/design/2bSUA8wuI0nY6E3eN0Cesd/Phonebanker?node-id=0-38&m=dev
 */
import { useEffect, useState } from 'react';
import { apiFetch } from '@/shared/api/apiFetch';
import { Button } from '@/shared/Button/Button';
import { ViewListSchema, type View } from '@/view/viewsSchema';
import { useOrganiserStore } from '../../organiserStore';
import './ViewSelection.css';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; views: View[] }
  | { kind: 'error'; message: string };

export const ViewSelection = () => {
  const selectedView = useOrganiserStore((s) => s.selectedView);
  const selectView = useOrganiserStore((s) => s.selectView);
  const goNext = useOrganiserStore((s) => s.goNext);

  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    apiFetch('/views', ViewListSchema)
      .then((views) => {
        if (!cancelled) setState({ kind: 'ready', views });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setState({ kind: 'error', message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="view-selection">
      <header>
        <h1 className="step-heading">Who are we calling tonight?</h1>
        <p className="step-subhead">
          Pick a list from Airtable. We'll only show contacts in this view.
        </p>
      </header>

      {state.kind === 'loading' && <p className="status">Loading your views…</p>}
      {state.kind === 'error' && (
        <p className="status">
          Couldn't load your views — {state.message}. Try again in a moment, or speak to a fellow
          organiser.
        </p>
      )}
      {state.kind === 'ready' && state.views.length === 0 && (
        <p className="status">
          No views available — ask your Airtable admin to set one up for tonight.
        </p>
      )}
      {state.kind === 'ready' && state.views.length > 0 && (
        <ul className="views">
          {state.views.map((view) => {
            const isSelected = selectedView?.id === view.id;
            return (
              <li key={view.id}>
                <button
                  type="button"
                  className="view-option"
                  aria-pressed={isSelected}
                  onClick={() => selectView(view)}
                >
                  <span className="radio" aria-hidden="true" />
                  <span className="view-name">{view.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="actions">
        <Button variant="primary" fullWidth disabled={!selectedView} onClick={goNext}>
          Continue
        </Button>
      </div>
    </section>
  );
};
