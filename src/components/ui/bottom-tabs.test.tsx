// Tests for BottomTabs component (M0-4)
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomTabs } from './bottom-tabs.js';
import { t } from '../../i18n/t.js';

function renderWithRouter(initialPath = '/growth'): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomTabs />
    </MemoryRouter>,
  );
}

describe('BottomTabs', () => {
  it('renders all 3 labelled tab links', () => {
    renderWithRouter();

    expect(screen.getByRole('link', { name: t('nav.growth') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('nav.feeding') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('nav.profile') })).toBeInTheDocument();
  });

  it('shows visible text label for each tab', () => {
    renderWithRouter();

    expect(screen.getByText(t('nav.growth'))).toBeInTheDocument();
    expect(screen.getByText(t('nav.feeding'))).toBeInTheDocument();
    expect(screen.getByText(t('nav.profile'))).toBeInTheDocument();
  });

  it('marks the active tab with aria-current="page" when on /growth', () => {
    renderWithRouter('/growth');

    const growthLink = screen.getByRole('link', { name: t('nav.growth') });
    expect(growthLink).toHaveAttribute('aria-current', 'page');

    // Inactive tabs must NOT have aria-current="page"
    expect(screen.getByRole('link', { name: t('nav.feeding') })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: t('nav.profile') })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('marks the active tab with aria-current="page" when on /feeding', () => {
    renderWithRouter('/feeding');

    const feedingLink = screen.getByRole('link', { name: t('nav.feeding') });
    expect(feedingLink).toHaveAttribute('aria-current', 'page');
  });

  it('marks the active tab with aria-current="page" when on /profile', () => {
    renderWithRouter('/profile');

    const profileLink = screen.getByRole('link', { name: t('nav.profile') });
    expect(profileLink).toHaveAttribute('aria-current', 'page');
  });

  it('renders inside a nav landmark with an accessible name', () => {
    renderWithRouter();

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });
});
