import { ORGANISER_STEPS, useOrganiserStore } from './organiserStore';
import { Identify } from './steps/Identify/Identify';
import { ViewSelection } from './steps/ViewSelection/ViewSelection';
import { ScriptWriter } from './steps/ScriptWriter/ScriptWriter';
import { MessageWriter } from './steps/MessageWriter/MessageWriter';
import { SendLink } from './steps/SendLink/SendLink';
import './Organiser.css';

export const Organiser = () => {
  const step = useOrganiserStore((s) => s.step);
  const stepIndex = ORGANISER_STEPS.indexOf(step);
  const isFinal = step === 'review';

  return (
    <div className="organiser">
      <span className="progress-label">
        Step {stepIndex + 1} of {ORGANISER_STEPS.length}
        {isFinal && ' · Done'}
      </span>

      {step === 'identify' && <Identify />}
      {step === 'view' && <ViewSelection />}
      {step === 'script' && <ScriptWriter />}
      {step === 'message' && <MessageWriter />}
      {step === 'review' && <SendLink />}
    </div>
  );
};
