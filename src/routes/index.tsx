import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <section>
      <h1>Phonebanker</h1>
      <p>Organiser: create a session. Phonebanker: open the join link you were sent.</p>
    </section>
  );
}
