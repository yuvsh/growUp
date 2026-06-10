// Tests for MedicalDisclaimer component (M0-4)
import { render, screen } from '@testing-library/react';
import { MedicalDisclaimer } from './medical-disclaimer.js';
import { t } from '../../i18n/t.js';

describe('MedicalDisclaimer — footer variant', () => {
  it('renders the disclaimer body text', () => {
    render(<MedicalDisclaimer variant="footer" />);
    expect(screen.getByText(t('disclaimer.body'))).toBeInTheDocument();
  });

  it('has NO dismiss or close control', () => {
    render(<MedicalDisclaimer variant="footer" />);

    // No button at all
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    // No element with close/dismiss accessible name patterns
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /×/i })).not.toBeInTheDocument();
  });

  it('is rendered as an aside landmark with an accessible label', () => {
    render(<MedicalDisclaimer variant="footer" />);
    expect(screen.getByRole('complementary', { name: 'Medical disclaimer' })).toBeInTheDocument();
  });
});

describe('MedicalDisclaimer — block variant', () => {
  it('renders the disclaimer body text', () => {
    render(<MedicalDisclaimer variant="block" />);
    expect(screen.getByText(t('disclaimer.body'))).toBeInTheDocument();
  });

  it('has NO dismiss or close control', () => {
    render(<MedicalDisclaimer variant="block" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });
});
