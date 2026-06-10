// PrimaryLayout — wraps Growth, Feeding, Profile with BottomTabs + MedicalDisclaimer footer.
// Guards child-required routes: shows LoadingSpinner during async repository check,
// then either renders the screen or redirects to /onboarding.
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { BottomTabs } from '../components/ui/bottom-tabs.js';
import { MedicalDisclaimer } from '../components/ui/medical-disclaimer.js';
import { LoadingSpinner } from '../components/ui/loading-spinner.js';
import { useRequireChild } from './useRequireChild.js';

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100dvh',
  paddingBlockEnd: '72px', // clearance for fixed BottomTabs (~44px + breathing room)
};

const contentStyle: React.CSSProperties = {
  flex: 1,
};

const loadingContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100dvh',
};

export function PrimaryLayout(): React.JSX.Element {
  const guardState = useRequireChild();

  if (guardState === 'loading' || guardState === 'redirecting') {
    return (
      <div style={loadingContainerStyle}>
        <LoadingSpinner size="lg" label="Loading" />
      </div>
    );
  }

  return (
    <div style={layoutStyle}>
      {/*
        ScrollRestoration uses the pathname as the key, so each tab remembers
        its own scroll position independently. Placed inside the layout (not
        the root) so it is always mounted while the primary screens are active.
      */}
      <ScrollRestoration getKey={(location) => location.pathname} />
      <div style={contentStyle}>
        <Outlet />
      </div>
      <MedicalDisclaimer variant="footer" />
      <BottomTabs />
    </div>
  );
}
