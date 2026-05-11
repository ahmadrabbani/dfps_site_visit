import * as Keychain from 'react-native-keychain';
import {reportServiceError} from './errorReporting';
import type {SessionUser} from './api';

/** Isolated service name so we do not clash with other Keychain entries. */
const KEYCHAIN_SERVICE = 'dfps-site-visit-session';

/**
 * Persist session the same way for fake or real API: auth token + officer profile.
 * Raw password is never written to Keychain.
 */
export async function saveSession(user: SessionUser): Promise<boolean> {
  if (!user?.token) {
    return false;
  }
  const payload = JSON.stringify({
    id: user.id,
    name: user.name ?? 'Officer',
    token: user.token,
  });
  const result = await Keychain.setGenericPassword('session', payload, {
    service: KEYCHAIN_SERVICE,
  });
  if (result === false) {
    reportServiceError('authService.saveSession', 'Keychain save failed');
  }
  return result !== false;
}

/**
 * @returns user session if present, else null
 */
export async function loadSession(): Promise<SessionUser | null> {
  const creds = await Keychain.getGenericPassword({service: KEYCHAIN_SERVICE});
  if (!creds || !('password' in creds) || !creds.password) {
    return null;
  }
  try {
    const data = JSON.parse(creds.password) as SessionUser | null;
    if (!data?.token) {
      return null;
    }
    return {
      id: data.id,
      name: data.name ?? 'Officer',
      token: data.token,
    };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
  } catch (e) {
    reportServiceError('authService.clearSession', e);
  }
}
