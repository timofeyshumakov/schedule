/**
 * Thin BX24 / webhook wrapper used by domain-level helpers if needed.
 * Primary Bitrix calls live in appStore (bitrixCall / callApi).
 */
import { BITRIX24_WEBHOOK, APP_CONFIG } from '../config/constants';

export function getBX24() {
  return typeof window !== 'undefined' ? window.BX24 : undefined;
}

export async function callBitrixMethod(method, params = {}) {
  const bx = getBX24();
  if (bx && typeof bx.callMethod === 'function') {
    return new Promise((resolve, reject) => {
      bx.callMethod(method, params, (result) => {
        if (result.error()) reject(new Error(result.error()));
        else resolve(result.data());
      });
    });
  }

  const base = (BITRIX24_WEBHOOK || '').replace(/\/?$/, '/');
  if (!base || base.includes('xxxxxxxx')) {
    throw new Error('BX24 SDK и вебхук недоступны');
  }
  const res = await fetch(`${base}${method}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error_description || json.error);
  return json.result;
}

export { APP_CONFIG };
