/**
 * Figma: https://www.figma.com/design/2bSUA8wuI0nY6E3eN0Cesd/Phonebanker?node-id=0-221&m=dev
 */
import { Button } from '@/shared/Button/Button';
import { useOrganiserStore } from '../../organiserStore';
import './Identify.css';

export const Identify = () => {
  const organiserName = useOrganiserStore((s) => s.organiserName);
  const setOrganiserName = useOrganiserStore((s) => s.setOrganiserName);
  const goNext = useOrganiserStore((s) => s.goNext);

  const canContinue = organiserName.trim().length > 0;

  return (
    <section className="identify">
      <header>
        <h1 className="step-heading">Who's setting up tonight?</h1>
        <p className="step-subhead">
          Your name goes on the session so other organisers know who put it together.
        </p>
      </header>

      <label className="identify-field" htmlFor="organiser-name">
        <span className="identify-label">What's your first name?</span>
        <input
          id="organiser-name"
          className="identify-input"
          type="text"
          autoComplete="given-name"
          value={organiserName}
          onChange={(e) => setOrganiserName(e.target.value)}
        />
      </label>

      <div className="actions">
        <Button variant="primary" fullWidth disabled={!canContinue} onClick={goNext}>
          Continue
        </Button>
      </div>
    </section>
  );
};
