import {getSurveyApiSecret} from '../config/env';

type CryptoJsModule = typeof import('crypto-js');

function loadCryptoJs(): CryptoJsModule {
  // Lazy load — avoids bundling/startup issues on some release builds.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('crypto-js') as CryptoJsModule;
}

/** Matches housingportal hourly token: base64(iv + openssl_encrypt(...)). */
export function formatKarachiHour(date: Date): string {
  const formatted = date.toLocaleString('en-CA', {
    timeZone: 'Asia/Karachi',
    hour12: false,
  });
  const [datePart, timePart] = formatted.split(', ');
  const hour = timePart.split(':')[0]?.padStart(2, '0') ?? '00';
  return `${datePart} ${hour}`;
}

/** PHP openssl pads short keys with null bytes to 32 for AES-256-CBC. */
function phpAesKey(secret: string, CryptoJS: CryptoJsModule): CryptoJsModule['lib']['WordArray'] {
  return CryptoJS.enc.Latin1.parse(secret.padEnd(32, '\0').slice(0, 32));
}

/** Same algorithm as housingportal/add_completion_certificate_survey.php. */
export function generateSurveyApiKey(date = new Date(), secret = getSurveyApiSecret()): string {
  const CryptoJS = loadCryptoJs();
  const plaintext = `access_granted_${formatKarachiHour(date)}`;
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = phpAesKey(secret, CryptoJS);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const encryptedBase64 = CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
  return CryptoJS.enc.Base64.stringify(iv.concat(CryptoJS.enc.Utf8.parse(encryptedBase64)));
}
