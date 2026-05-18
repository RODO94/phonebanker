import { ORGANISER_STEPS, useOrganiserStore } from './organiserStore';
import { ViewSelection } from './steps/ViewSelection/ViewSelection';
import { ScriptWriter } from './steps/ScriptWriter/ScriptWriter';
import { MessageWriter } from './steps/MessageWriter/MessageWriter';
import { SendLink } from './steps/SendLink/SendLink';
import './Organiser.css';

const STEP_LABELS = {
  view: 'Pick a list',
  script: 'Write your script',
  message: 'Write a message to leave',
  review: 'Review and share',
} as const;

export const Organiser = () => {
  const step = useOrganiserStore((s) => s.step);

  const stepIndex = ORGANISER_STEPS.indexOf(step);

  return (
    <div className="organiser">
      <div className="progress">
        <span className="progress-label">
          Step {stepIndex + 1} of {ORGANISER_STEPS.length} — {STEP_LABELS[step]}
        </span>
        <div className="progress-bar" role="presentation">
          {ORGANISER_STEPS.map((s, i) => (
            <span
              key={s}
              className="progress-bar-step"
              data-state={i < stepIndex ? 'complete' : i === stepIndex ? 'active' : 'pending'}
            />
          ))}
        </div>
      </div>

      {step === 'view' && <ViewSelection />}
      {step === 'script' && <ScriptWriter />}
      {step === 'message' && <MessageWriter />}
      {step === 'review' && <SendLink />}
    </div>
  );
};
