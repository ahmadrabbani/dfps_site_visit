import * as Keychain from 'react-native-keychain';

/** Isolated service name so we do not clash with other Keychain entries. */
const KEYCHAIN_SERVICE = 'dfps-site-visit-session';

/**
 * Persist session the same way for fake or real API: auth token + officer profile.
 * Raw password is never written to Keychain.
 *
 * @param {object} user - shape `{ id, name, token, ... }` from `login()`
 */
export async function saveSession(user) {
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
    console.warn('[authService] Keychain save failed');
  }
  return result !== false;
}

/**
 * @returns {Promise<{id: number|string, name: string, token: string}|null>}
 */
export async function loadSession() {
  const creds = await Keychain.getGenericPassword({service: KEYCHAIN_SERVICE});
  if (!creds?.password) {
    return null;
  }
  try {
    const data = JSON.parse(creds.password);
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

export async function clearSession() {
  try {
    await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
  } catch (e) {
    console.warn('[authService] clearSession', e?.message);
  }
}
