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
    username: user.username ?? user.name,
    name: user.name ?? 'Officer',
    token: user.token,
    portalCookie: user.portalCookie ?? null,
    isDevTestLogin: user.isDevTestLogin === true,
  });
  const result = await Keychain.setGenericPassword('session', payload, {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
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
  try {
    const creds = await Keychain.getGenericPassword({service: KEYCHAIN_SERVICE});
    if (!creds || !('password' in creds) || !creds.password) {
      return null;
    }
    const data = JSON.parse(creds.password) as SessionUser | null;
    if (!data?.token || data.token === 'bypass') {
      return null;
    }
    return {
      id: data.id,
      username: data.username ?? data.name ?? 'Officer',
      name: data.name ?? 'Officer',
      token: data.token,
      portalCookie: data.portalCookie ?? null,
      isDevTestLogin: data.isDevTestLogin === true,
    };
  } catch (e) {
    reportServiceError('authService.loadSession', e);
    return null;
  }
}

export async function getPortalSessionCookie(): Promise<string | null> {
  const creds = await Keychain.getGenericPassword({service: KEYCHAIN_SERVICE});
  if (!creds || !('password' in creds) || !creds.password) {
    return null;
  }
  try {
    const data = JSON.parse(creds.password) as {portalCookie?: string | null};
    return data.portalCookie?.trim() || null;
  } catch {
    return null;
  }
}

export async function savePortalSessionCookie(cookie: string | null): Promise<void> {
  const user = await loadSession();
  if (!user) {
    return;
  }
  await saveSession({...user, portalCookie: cookie});
}

export async function clearSession(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
  } catch (e) {
    reportServiceError('authService.clearSession', e);
  }
}
