import { useEffect } from 'react';
import { usePhonebankerStore, type PhonebankerStep } from './phonebankerStore';
import { PhonebankHeader } from './PhonebankHeader/PhonebankHeader';
import { Join } from './steps/Join/Join';
import { AlreadyJoined } from './steps/AlreadyJoined/AlreadyJoined';
import { AssignedContact } from './steps/AssignedContact/AssignedContact';
import { NoAnswerFollowUp } from './steps/NoAnswerFollowUp/NoAnswerFollowUp';
import { WantsRemoved } from './steps/WantsRemoved/WantsRemoved';
import { Done } from './steps/Done/Done';
import { SessionEnded } from './steps/SessionEnded/SessionEnded';
import './Phonebanker.css';

type PhonebankerProps = { sessionId: string };

// The steps that make up the active call loop — the brand + burn-down header
// persists across these. Entry screens (join / already-joined / session-ended)
// and the end celebration (done) carry no header.
const CALL_LOOP_STEPS = new Set<PhonebankerStep>([
  'assigned',
  'noAnswerFollowUp',
  'wantsRemoved',
]);

// Top-level phonebanker route component. Reads the current step and renders one
// screen. Step transitions are owned by the screens themselves (driven by server
// responses) — this shell only routes. Segment 0 wires the branches; B1/B2 fill
// in the screen bodies in their own folders without touching this file.
export function Phonebanker({ sessionId }: PhonebankerProps) {
  const step = usePhonebankerStore((s) => s.step);
  const total = usePhonebankerStore((s) => s.total);
  const called = usePhonebankerStore((s) => s.called);

  useEffect(() => {
    usePhonebankerStore.setState({ sessionId });
  }, [sessionId]);

  // The assigned screen widens to a two-column layout on larger viewports, so it
  // breaks out of the default narrow cap; every other step stays single-column.
  const shellClass = step === 'assigned' ? 'phonebanker is-wide' : 'phonebanker';

  return (
    <div className={shellClass}>
      {CALL_LOOP_STEPS.has(step) && <PhonebankHeader total={total} called={called} />}
      <div className="phonebanker-screen">
        {step === 'join' && <Join />}
        {step === 'alreadyJoined' && <AlreadyJoined />}
        {step === 'assigned' && <AssignedContact />}
        {step === 'noAnswerFollowUp' && <NoAnswerFollowUp />}
        {step === 'wantsRemoved' && <WantsRemoved />}
        {step === 'done' && <Done />}
        {step === 'sessionEnded' && <SessionEnded />}
      </div>
    </div>
  );
}
