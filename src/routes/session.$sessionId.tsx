import { createFileRoute } from '@tanstack/react-router';
import { Phonebanker } from '@/phonebanker/Phonebanker';

export const Route = createFileRoute('/session/$sessionId')({
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();
  return <Phonebanker sessionId={sessionId} />;
}
