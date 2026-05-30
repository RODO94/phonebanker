import { useEffect } from 'react';
import { usePhonebankerStore } from './phonebankerStore';
import { Join } from './steps/Join/Join';
import { AlreadyJoined } from './steps/AlreadyJoined/AlreadyJoined';
import { AssignedContact } from './steps/AssignedContact/AssignedContact';
import { NoAnswerFollowUp } from './steps/NoAnswerFollowUp/NoAnswerFollowUp';
import { WantsRemoved } from './steps/WantsRemoved/WantsRemoved';
import { Done } from './steps/Done/Done';
import { SessionEnded } from './steps/SessionEnded/SessionEnded';
import './Phonebanker.css';

type PhonebankerProps = { sessionId: string };

// Top-level phonebanker route component. Reads the current step and renders one
// screen. Step transitions are owned by the screens themselves (driven by server
// responses) — this shell only routes. Segment 0 wires the branches; B1/B2 fill
// in the screen bodies in their own folders without touching this file.
export function Phonebanker({ sessionId }: PhonebankerProps) {
  const step = usePhonebankerStore((s) => s.step);

  useEffect(() => {
    usePhonebankerStore.setState({ sessionId });
  }, [sessionId]);

  return (
    <div className="phonebanker">
      {step === 'join' && <Join />}
      {step === 'alreadyJoined' && <AlreadyJoined />}
      {step === 'assigned' && <AssignedContact />}
      {step === 'noAnswerFollowUp' && <NoAnswerFollowUp />}
      {step === 'wantsRemoved' && <WantsRemoved />}
      {step === 'done' && <Done />}
      {step === 'sessionEnded' && <SessionEnded />}
    </div>
  );
}
