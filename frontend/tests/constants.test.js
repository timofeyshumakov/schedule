import { describe, expect, it } from 'vitest';
import { API_BASE, APP_CONFIG, BITRIX24_WEBHOOK, CRM_FIELDS } from '../src/config/constants.js';

describe('constants from env', () => {
  it('loads API_BASE without trailing slash', () => {
    expect(API_BASE).toBeTruthy();
    expect(API_BASE.endsWith('/')).toBe(false);
  });

  it('loads BITRIX24_WEBHOOK with trailing slash when set', () => {
    if (!BITRIX24_WEBHOOK) {
      expect(BITRIX24_WEBHOOK).toBe('');
      return;
    }
    expect(BITRIX24_WEBHOOK.endsWith('/')).toBe(true);
  });

  it('loads ADMIN_USER_ID as number', () => {
    expect(typeof APP_CONFIG.ADMIN_USER_ID).toBe('number');
    expect(APP_CONFIG.ADMIN_USER_ID).toBeGreaterThan(0);
  });

  it('exposes CRM field keys', () => {
    expect(CRM_FIELDS.DEAL_START).toMatch(/^UF_CRM_/);
    expect(CRM_FIELDS.DEAL_MAN_DAYS).toMatch(/^UF_CRM_/);
  });
});
