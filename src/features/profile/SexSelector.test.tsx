// Tests for SexSelector component (M1-3)
// Blueprint: docs/ui-blueprints.md → "Add / Edit Child"
// Design system: design-system/MASTER.md
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SexSelector } from './SexSelector.js';
import { t } from '../../i18n/t.js';

function renderSexSelector(
  value: 'male' | 'female' | null = null,
  onChange: (sex: 'male' | 'female') => void = () => undefined,
  error?: string,
  id?: string,
): void {
  render(
    <SexSelector value={value} onChange={onChange} error={error} id={id} />,
  );
}

describe('SexSelector', () => {
  it('renders both options with the group label', () => {
    renderSexSelector();

    expect(
      screen.getByRole('radiogroup', { name: t('profile.sex.label') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: t('profile.sex.male') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: t('profile.sex.female') }),
    ).toBeInTheDocument();
  });

  it('clicking Male option calls onChange with "male"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderSexSelector(null, onChange);

    await user.click(screen.getByRole('radio', { name: t('profile.sex.male') }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('male');
  });

  it('clicking Female option calls onChange with "female"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderSexSelector(null, onChange);

    await user.click(
      screen.getByRole('radio', { name: t('profile.sex.female') }),
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('female');
  });

  it('the selected option has aria-checked=true and unselected has aria-checked=false', () => {
    renderSexSelector('male');

    const maleRadio = screen.getByRole('radio', { name: t('profile.sex.male') });
    const femaleRadio = screen.getByRole('radio', {
      name: t('profile.sex.female'),
    });

    expect(maleRadio).toHaveAttribute('aria-checked', 'true');
    expect(femaleRadio).toHaveAttribute('aria-checked', 'false');
  });

  it('keyboard: Tab focuses first radio, arrow key moves to next, Enter selects', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderSexSelector(null, onChange);

    // Tab into the group — first radio should receive focus
    await user.tab();
    expect(
      screen.getByRole('radio', { name: t('profile.sex.male') }),
    ).toHaveFocus();

    // Arrow-right/down should move to the next option and trigger onChange
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('female');
  });

  it('keyboard: Enter on a focused option calls onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderSexSelector(null, onChange);

    const maleRadio = screen.getByRole('radio', {
      name: t('profile.sex.male'),
    });
    maleRadio.focus();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith('male');
  });

  it('renders error text with role="alert" when error prop is set', () => {
    renderSexSelector(null, () => undefined, 'Please select a sex');

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Please select a sex');
  });

  it('does not render an alert when error prop is not provided', () => {
    renderSexSelector();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('the why-we-ask helper is associated via aria-describedby on the group', () => {
    renderSexSelector();

    const group = screen.getByRole('radiogroup');
    const describedById = group.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();

    const helperEl = document.getElementById(describedById as string);
    expect(helperEl).toBeInTheDocument();
    expect(helperEl).toHaveTextContent(t('profile.sex.why'));
  });
});
