// routes.tsx — React Router v7 route tree for GrowUp.
//
// Route map (from docs/ui-blueprints.md):
//   /               → redirect to /growth if child exists, else /onboarding
//   /onboarding     → Onboarding screen (block MedicalDisclaimer, no tabs)
//   /profile        → Profile screen        (needs child → PrimaryLayout guards it)
//   /profile/child  → ChildForm screen      (no guard — reached from onboarding CTA too)
//   /growth         → Growth screen         (needs child → PrimaryLayout guards it)
//   /feeding        → Feeding screen        (needs child → PrimaryLayout guards it)
//
// Code-splitting: the heavy screens (Growth pulls in Recharts; every screen pulls
// in the Supabase-backed repository/auth) are loaded lazily via React.lazy so the
// initial bundle only ships the shell + RootRedirect. Each lazy element is wrapped
// in a calm, centered Suspense fallback (LazyRoute). RootRedirect and PrimaryLayout
// stay eager — they are tiny and always needed on first paint.
import React, { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootRedirect } from './RootRedirect.js';
import { PrimaryLayout } from './PrimaryLayout.js';
import { LoadingSpinner } from '../components/ui/loading-spinner.js';

// Named exports → map to a default export for React.lazy.
const Onboarding = React.lazy(() =>
  import('../features/profile/Onboarding.js').then((m) => ({
    default: m.Onboarding,
  })),
);
const ChildForm = React.lazy(() =>
  import('../features/profile/ChildForm.js').then((m) => ({
    default: m.ChildForm,
  })),
);
const Profile = React.lazy(() =>
  import('../features/profile/Profile.js').then((m) => ({
    default: m.Profile,
  })),
);
const Growth = React.lazy(() =>
  import('../features/growth/Growth.js').then((m) => ({ default: m.Growth })),
);
const Feeding = React.lazy(() =>
  import('../features/feeding/Feeding.js').then((m) => ({
    default: m.Feeding,
  })),
);
const AuthCallback = React.lazy(() =>
  import('./AuthCallback.js').then((m) => ({ default: m.AuthCallback })),
);

/** Calm, centered fallback shown while a lazy route chunk loads. */
function LazyRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <LoadingSpinner size="lg" label="Loading" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    // Root redirect — checks repository; shows spinner while async check runs
    path: '/',
    element: <RootRedirect />,
  },
  {
    // OAuth callback — restores the Supabase session from the URL, then routes home
    path: '/auth/callback',
    element: (
      <LazyRoute>
        <AuthCallback />
      </LazyRoute>
    ),
  },
  {
    // Onboarding — no tabs, no guard; shows block MedicalDisclaimer inside screen
    path: '/onboarding',
    element: (
      <LazyRoute>
        <Onboarding />
      </LazyRoute>
    ),
  },
  {
    // ChildForm — no guard; reachable from onboarding CTA and profile edit
    path: '/profile/child',
    element: (
      <LazyRoute>
        <ChildForm />
      </LazyRoute>
    ),
  },
  {
    // Primary screens — guarded (redirect to /onboarding if no child), with BottomTabs + disclaimer footer
    element: <PrimaryLayout />,
    children: [
      {
        path: '/growth',
        element: (
          <LazyRoute>
            <Growth />
          </LazyRoute>
        ),
      },
      {
        path: '/feeding',
        element: (
          <LazyRoute>
            <Feeding />
          </LazyRoute>
        ),
      },
      {
        path: '/profile',
        element: (
          <LazyRoute>
            <Profile />
          </LazyRoute>
        ),
      },
    ],
  },
]);
