/**
 * Figma: https://www.figma.com/design/2bSUA8wuI0nY6E3eN0Cesd/Phonebanker?node-id=0-216&m=dev
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import '@/shared/Button/Button.css';
import './index.css';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <section className="home">
      <h1 className="home-heading">Phonebanker</h1>
      <p className="home-subhead">
        A calling tool for London Renters Union organisers and members.
      </p>
      <div className="home-actions">
        <Link to="/organise" className="button primary full-width">
          Organise a session
        </Link>
        <p className="home-subhead">
          Joining a session? Open the link your organiser sent.
        </p>
      </div>
    </section>
  );
}
