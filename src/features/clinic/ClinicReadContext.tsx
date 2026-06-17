// Clinic Mode — shared ephemeral state across the clinic routes.
//
// `useClinicRead` holds its state per-hook-instance. The form (which calls
// submit()) and the result screen (which reads `read`) live on DIFFERENT routes,
// so they must share ONE instance. This context provides that single instance.
//
// EPHEMERAL CONTRACT: this file deliberately imports nothing from data/, auth/,
// or lib/supabase/. The shared state still lives only in React memory and is
// gone on unmount/refresh — mounting the provider at a clinic layout route means
// navigating away from /clinic entirely tears it down.
import { createContext, useContext, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useClinicRead, type UseClinicRead } from './useClinicRead';

const ClinicReadContext = createContext<UseClinicRead | null>(null);

interface ClinicReadProviderProps {
  children: ReactNode;
}

/**
 * Provides a single shared `useClinicRead` instance to all descendants.
 * Mount once at the clinic layout route so /clinic, /clinic/read and
 * /clinic/result share the same ephemeral state.
 */
export function ClinicReadProvider({
  children,
}: ClinicReadProviderProps): React.JSX.Element {
  const value = useClinicRead();
  return (
    <ClinicReadContext.Provider value={value}>
      {children}
    </ClinicReadContext.Provider>
  );
}

/**
 * Clinic layout route element: wraps the clinic screens in the shared provider.
 * Registered OUTSIDE PrimaryLayout (no child guard, no bottom tabs).
 */
export function ClinicLayout(): React.JSX.Element {
  return (
    <ClinicReadProvider>
      <Outlet />
    </ClinicReadProvider>
  );
}

/** Read the shared clinic state from the nearest ClinicReadProvider. */
export function useClinicReadContext(): UseClinicRead {
  const context = useContext(ClinicReadContext);
  if (context === null) {
    throw new Error(
      'useClinicReadContext must be used within a ClinicReadProvider',
    );
  }
  return context;
}
