// routes.tsx — React Router v7 route tree for GrowUp.
//
// Route map (from docs/ui-blueprints.md):
//   /               → redirect to /growth if child exists, else /onboarding
//   /onboarding     → Onboarding screen (block MedicalDisclaimer, no tabs)
//   /profile        → Profile screen        (needs child → PrimaryLayout guards it)
//   /profile/child  → ChildForm screen      (no guard — reached from onboarding CTA too)
//   /growth         → Growth screen         (needs child → PrimaryLayout guards it)
//   /feeding        → Feeding screen        (needs child → PrimaryLayout guards it)
import { createBrowserRouter } from 'react-router-dom';
import { RootRedirect } from './RootRedirect.js';
import { AuthCallback } from './AuthCallback.js';
import { PrimaryLayout } from './PrimaryLayout.js';
import { Onboarding } from '../features/profile/Onboarding.js';
import { Growth } from '../features/growth/Growth.js';
import { Feeding } from '../features/feeding/Feeding.js';
import { Profile } from '../features/profile/Profile.js';
import { ChildForm } from '../features/profile/ChildForm.js';

export const router = createBrowserRouter([
  {
    // Root redirect — checks repository; shows spinner while async check runs
    path: '/',
    element: <RootRedirect />,
  },
  {
    // OAuth callback — restores the Supabase session from the URL, then routes home
    path: '/auth/callback',
    element: <AuthCallback />,
  },
  {
    // Onboarding — no tabs, no guard; shows block MedicalDisclaimer inside screen
    path: '/onboarding',
    element: <Onboarding />,
  },
  {
    // ChildForm — no guard; reachable from onboarding CTA and profile edit
    path: '/profile/child',
    element: <ChildForm />,
  },
  {
    // Primary screens — guarded (redirect to /onboarding if no child), with BottomTabs + disclaimer footer
    element: <PrimaryLayout />,
    children: [
      {
        path: '/growth',
        element: <Growth />,
      },
      {
        path: '/feeding',
        element: <Feeding />,
      },
      {
        path: '/profile',
        element: <Profile />,
      },
    ],
  },
]);
