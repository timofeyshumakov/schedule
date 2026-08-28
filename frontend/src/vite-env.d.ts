/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_BITRIX24_WEBHOOK: string;
  readonly VITE_ADMIN_USER_ID?: string;
  readonly VITE_CRM_DEAL_START?: string;
  readonly VITE_CRM_DEAL_END?: string;
  readonly VITE_CRM_DEAL_MAN_DAYS?: string;
  readonly VITE_CRM_DEAL_CALC_START?: string;
  readonly VITE_CRM_DEAL_CALC_END?: string;
  readonly VITE_CRM_DEAL_CALC_MAN_DAYS?: string;
  readonly VITE_CRM_DEAL_CONFIRMED_START?: string;
  readonly VITE_CRM_DEAL_CONFIRMED_END?: string;
  readonly VITE_ISDAYOFF_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface Window {
  BX24?: {
    init?: (cb: () => void) => void;
    callMethod: (method: string, params: unknown, cb: (result: unknown) => void) => void;
    callBatch?: (cmd: unknown, cb: (result: unknown) => void) => void;
    isAdmin?: () => boolean;
    placement?: { info: () => { options?: { ID?: string | number } } };
  };
}
