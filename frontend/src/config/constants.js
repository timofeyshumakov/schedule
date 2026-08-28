/** Backend API — из .env (VITE_API_BASE) */
export const API_BASE = (import.meta.env.VITE_API_BASE || '').trim().replace(/\/$/, '');

/**
 * Вебхук Bitrix24 REST — из .env (VITE_BITRIX24_WEBHOOK)
 * Используется, если BX24 SDK недоступен
 */
export const BITRIX24_WEBHOOK = (() => {
  const raw = (import.meta.env.VITE_BITRIX24_WEBHOOK || '').trim();
  if (!raw) return '';
  return raw.replace(/\/?$/, '/');
})();

/** Поля CRM для сделок */
export const CRM_FIELDS = {
  DEAL_CONFIRMED_START: import.meta.env.VITE_CRM_DEAL_CONFIRMED_START || 'UF_CRM_1784028743',
  DEAL_CONFIRMED_END: import.meta.env.VITE_CRM_DEAL_CONFIRMED_END || 'UF_CRM_1784028783',
  DEAL_START: import.meta.env.VITE_CRM_DEAL_START || 'UF_CRM_1784028802',
  DEAL_END: import.meta.env.VITE_CRM_DEAL_END || 'UF_CRM_1784028824',
  DEAL_MAN_DAYS: import.meta.env.VITE_CRM_DEAL_MAN_DAYS || 'UF_CRM_1784028978',
  DEAL_CALC_START: import.meta.env.VITE_CRM_DEAL_CALC_START || 'UF_CRM_1784028844',
  DEAL_CALC_END: import.meta.env.VITE_CRM_DEAL_CALC_END || 'UF_CRM_1784028947',
  DEAL_CALC_MAN_DAYS: import.meta.env.VITE_CRM_DEAL_CALC_MAN_DAYS || 'UF_CRM_1784029798',
};

/** Настройки приложения */
export const APP_CONFIG = {
  ADMIN_USER_ID: Number(import.meta.env.VITE_ADMIN_USER_ID || 21),
  CAPACITY_RATIO_LIMIT: 0.9,
  BITRIX_PAGE_SIZE: 50,
  MAX_DEAL_EXTENSION_DAYS: 90,
  REDISTRIBUTE_MAX_ITERATIONS: 3,
  REDISTRIBUTE_MAX_EXTENSION_DAYS: 180,
  CHART_SCROLL_SPEED: 3,
  CHART_MONTHS_LOOKBACK: 1,
  CHART_YEARS_AHEAD: 1,
  OVERLOAD_MONTHS_AHEAD: 14,
  DEAL_LIST_MONTHS_BACK: 1,
  OPTIMIZATION_MONTHS_AHEAD: 3,
  MAN_DAYS_DECIMALS: 1,
};

export const ISDAYOFF_API_URL =
  import.meta.env.VITE_ISDAYOFF_API_URL || 'https://isdayoff.ru/api/getdata';

export function buildDealCalcFields(startDate, endDate, manDays) {
  return {
    [CRM_FIELDS.DEAL_CALC_START]: startDate,
    [CRM_FIELDS.DEAL_CALC_END]: endDate,
    [CRM_FIELDS.DEAL_CALC_MAN_DAYS]: manDays,
  };
}
