import { invoke } from '@tauri-apps/api/core';
import type { Role, SessionInfo } from './types';

const PUBLIC = new Set(['setup_status', 'setup_owner', 'login', 'branding', 'list_templates', 'recovery_options', 'recover_account', 'print_window', 'license_status', 'activate_license']);

let session: SessionInfo | null = null;
let onExpired: (() => void) | null = null;
let onLicence: (() => void) | null = null;

export const auth = {
  get session() { return session; },
  set(s: SessionInfo | null) { session = s; },
  onExpired(fn: () => void) { onExpired = fn; },
  onLicenceRequired(fn: () => void) { onLicence = fn; },
  can(min: Role): boolean {
    const rank: Record<Role, number> = { cashier: 1, manager: 2, owner: 3 };
    return !!session && rank[session.role] >= rank[min];
  },
};

/** Calls a backend command, attaching the session token for protected commands. */
export async function call<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const payload = PUBLIC.has(name) ? args : { ...args, sessionToken: session?.token ?? '' };
  try {
    return await invoke<T>(name, payload);
  } catch (err) {
    const message = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err);
    if (/session has expired/i.test(message) && onExpired) onExpired();
    if (message.startsWith('LICENCE_REQUIRED') && onLicence) { onLicence(); throw new Error('This copy of eStock Manager needs to be activated.'); }
    throw new Error(message);
  }
}
