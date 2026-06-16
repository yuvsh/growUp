// PrimaryLayout — wraps Growth, Feeding, Profile with BottomTabs + MedicalDisclaimer footer.
// Guards child-required routes: shows LoadingSpinner during async repository check,
// then either renders the screen or redirects to /onboarding.
import { Outlet } from 'react-router-dom';
import { BottomTabs } from '../components/ui/bottom-tabs.js';
import { MedicalDisclaimer } from '../components/ui/medical-disclaimer.js';
import { LoadingSpinner } from '../components/ui/loading-spinner.js';
import { SyncUploadPrompt } from '../features/sync/SyncUploadPrompt.js';
import { useRequireChild } from './useRequireChild.js';
import { useScrollMemory } from './useScrollMemory.js';

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
  // Remember/restore scroll position per tab (async-content aware).
  useScrollMemory();

  if (guardState === 'loading' || guardState === 'redirecting') {
    return (
      <div style={loadingContainerStyle}>
        <LoadingSpinner size="lg" label="Loading" />
      </div>
    );
  }

  return (
    <div style={layoutStyle}>
      <div style={contentStyle}>
        <Outlet />
      </div>
      <MedicalDisclaimer variant="footer" />
      <BottomTabs />
      <SyncUploadPrompt />
    </div>
  );
}
