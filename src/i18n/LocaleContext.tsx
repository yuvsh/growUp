import { createContext, useContext, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types — the swap point: adding Hebrew means changing `locale` to a union
// and `dir` to `'ltr' | 'rtl'`. All consumers (via `useLocale`) adapt
// automatically because they read from context rather than hard-coding values.
// ---------------------------------------------------------------------------

type Locale = 'en';
type Dir = 'ltr';

interface LocaleContextValue {
  locale: Locale;
  dir: Dir;
}

const DEFAULT_LOCALE: LocaleContextValue = {
  locale: 'en',
  dir: 'ltr',
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const LocaleContext = createContext<LocaleContextValue>(DEFAULT_LOCALE);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps): React.JSX.Element {
  return (
    <LocaleContext.Provider value={DEFAULT_LOCALE}>
      {children}
    </LocaleContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
