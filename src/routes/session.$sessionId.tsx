import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/session/$sessionId')({
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();
  return (
    <section>
      <h1>Session</h1>
      <p>Session ID: {sessionId}</p>
    </section>
  );
}
