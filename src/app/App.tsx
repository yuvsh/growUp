// App.tsx — composes providers (AuthProvider, LocaleProvider) around the router.
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.js';
import { LocaleProvider } from '../i18n/LocaleContext.js';
import { router } from './routes.js';

export function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <LocaleProvider>
        <RouterProvider router={router} />
      </LocaleProvider>
    </AuthProvider>
  );
}
