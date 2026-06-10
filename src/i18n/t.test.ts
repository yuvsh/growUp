import { describe, it, expect } from 'vitest';
import { t, type CopyKey } from './t.js';

describe('t()', () => {
  it('resolves app.name to "GrowUp"', () => {
    expect(t('app.name')).toBe('GrowUp');
  });

  it('resolves a nested nav key', () => {
    expect(t('nav.growth')).toBe('Growth');
    expect(t('nav.feeding')).toBe('Feeding');
    expect(t('nav.profile')).toBe('Profile');
  });

  it('resolves common keys', () => {
    expect(t('common.save')).toBe('Save');
    expect(t('common.cancel')).toBe('Cancel');
    expect(t('common.delete')).toBe('Delete');
  });

  it('resolves onboarding.cta', () => {
    expect(t('onboarding.cta')).toBe('Add your baby');
  });

  it('resolves disclaimer.body (non-empty string)', () => {
    const body = t('disclaimer.body');
    expect(typeof body).toBe('string');
    expect(body.length).toBeGreaterThan(0);
    // Spot-check that it mentions the key concepts
    expect(body).toMatch(/informational/i);
    expect(body).toMatch(/FTT|failure to thrive/i);
  });

  it('throws a clear error for an unknown key (runtime cast)', () => {
    // We intentionally cast to bypass TS — testing the runtime guard
    expect(() => t('nonexistent.key' as CopyKey)).toThrow('[i18n]');
  });

  it('throws when traversing a leaf as if it were a namespace', () => {
    // 'app.name.extra' — 'name' is a string, not an object
    expect(() => t('app.name.extra' as CopyKey)).toThrow('[i18n]');
  });
});
