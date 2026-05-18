import { createRootRoute, Outlet } from '@tanstack/react-router';

/**
 * Within the main layout here, we want space for a header and footer
 * These two components can go within ./shared/components
 * Link for the header: https://www.figma.com/design/2bSUA8wuI0nY6E3eN0Cesd/Phonebanker?node-id=0-218&m=dev
 * The footer should include similar styling to the header, but include a link to LRU https://londonrentersunion.org/
 */

export const Route = createRootRoute({
  component: () => (
    <main>
      <Outlet />
    </main>
  ),
});
