// BottomTabs — design-system/MASTER.md + docs/ui-blueprints.md "Shared — BottomTabs"
// Fixed bottom nav, 3 tabs: Growth · Feeding · Profile.
// Each tab: router link, ≥44×44px touch target, SVG icon + visible text label.
// Active state: aria-current="page" (set by NavLink) + icon fill + bold label + top border indicator.
// Logical CSS only (ps/pe/ms/me / insetInline / insetBlockEnd) — never left/right.
import { NavLink } from 'react-router-dom';
import { t } from '../../i18n/t.js';

// ---------------------------------------------------------------------------
// SVG Icons — inline, aria-hidden (label on the parent NavLink)
// ---------------------------------------------------------------------------

function GrowthIcon({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {filled ? (
        <path
          fill="currentColor"
          d="M3 18v-1L7 13l4 3 4-5 4 4v2H3zm0-3.5L7 10l4 3 4-5 4 4V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8.5z"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 17l4-4 4 3 4-5 4 4M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
        />
      )}
    </svg>
  );
}

function FeedingIcon({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {filled ? (
        <path
          fill="currentColor"
          d="M11 3a1 1 0 0 0-2 0v5H7V3a1 1 0 0 0-2 0v5a4 4 0 0 0 3 3.87V21a1 1 0 0 0 2 0v-9.13A4 4 0 0 0 13 8V3h-2zm6-1a1 1 0 0 0-1 1v7.5A2.5 2.5 0 0 0 18.5 13H19v8a1 1 0 0 0 2 0V3a1 1 0 0 0-1-1h-3z"
        />
      ) : (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 3v5m0 0a3 3 0 0 0 3 3v10M9 8a3 3 0 0 1-3-3V3m9-1v18m0-10.5A2.5 2.5 0 0 0 17.5 13H18" />
        </g>
      )}
    </svg>
  );
}

function ProfileIcon({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {filled ? (
        <path
          fill="currentColor"
          d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z"
        />
      ) : (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 19c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

interface TabConfig {
  to: string;
  label: string;
  renderIcon: (filled: boolean) => React.JSX.Element;
}

const TABS: TabConfig[] = [
  {
    to: '/growth',
    label: t('nav.growth'),
    renderIcon: (filled) => <GrowthIcon filled={filled} />,
  },
  {
    to: '/feeding',
    label: t('nav.feeding'),
    renderIcon: (filled) => <FeedingIcon filled={filled} />,
  },
  {
    to: '/profile',
    label: t('nav.profile'),
    renderIcon: (filled) => <ProfileIcon filled={filled} />,
  },
];

// ---------------------------------------------------------------------------
// BottomTabs
// ---------------------------------------------------------------------------

const navStyle: React.CSSProperties = {
  position: 'fixed',
  insetBlockEnd: '0',
  insetInlineStart: '0',
  insetInlineEnd: '0',
  backgroundColor: 'var(--color-surface)',
  borderTop: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-md)',
  zIndex: 50,
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const listItemStyle: React.CSSProperties = {
  flex: 1,
};

function tabLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-1)',
    minHeight: '44px',
    paddingBlock: 'var(--space-2)',
    paddingInline: 'var(--space-2)',
    textDecoration: 'none',
    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
    fontWeight: isActive ? 700 : 400,
    fontSize: 'var(--text-caption)',
    fontFamily: 'var(--font-body)',
    // Non-color active indicator: top border
    borderTop: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
    // Visible focus ring
    outlineOffset: '-2px',
    transition: `color var(--duration-fast) var(--ease-out),
                 border-color var(--duration-fast) var(--ease-out)`,
  };
}

export function BottomTabs(): React.JSX.Element {
  return (
    <nav aria-label="Main navigation" style={navStyle}>
      <ul role="list" style={listStyle}>
        {TABS.map((tab) => (
          <li key={tab.to} style={listItemStyle}>
            <NavLink
              to={tab.to}
              aria-label={tab.label}
              style={({ isActive }) => tabLinkStyle(isActive)}
            >
              {({ isActive }) => (
                <>
                  {tab.renderIcon(isActive)}
                  <span style={{ lineHeight: 1.2 }}>{tab.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
