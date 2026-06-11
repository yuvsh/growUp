// App.tsx — composes providers (AuthProvider, LocaleProvider, UiStateProvider) around the router.
// UiStateProvider is placed OUTSIDE RouterProvider so it never unmounts on tab navigation,
// acting as a React ViewModel that holds ephemeral view-state across all routes.
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.js';
import { LocaleProvider } from '../i18n/LocaleContext.js';
import { UiStateProvider } from '../ui-state/UiStateContext.js';
import { router } from './routes.js';

export function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <LocaleProvider>
        <UiStateProvider>
          <RouterProvider router={router} />
        </UiStateProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
