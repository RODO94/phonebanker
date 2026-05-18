import { createFileRoute } from '@tanstack/react-router';
import { Organiser } from '@/organiser/Organiser';

export const Route = createFileRoute('/organise')({
  component: Organiser,
});
