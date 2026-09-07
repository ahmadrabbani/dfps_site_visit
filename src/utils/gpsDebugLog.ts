type GpsDebugListener = (line: string) => void;

const MAX_LINES = 40;
const lines: string[] = [];
const listeners = new Set<GpsDebugListener>();

function formatData(data?: Record<string, unknown>): string {
  if (!data || Object.keys(data).length === 0) {
    return '';
  }
  try {
    return ` ${JSON.stringify(data)}`;
  } catch {
    return ' [data unserializable]';
  }
}

/** Log GPS steps to Metro/logcat and optional on-screen debug panel. */
export function gpsDebugLog(tag: string, message: string, data?: Record<string, unknown>): void {
  const ts = new Date().toISOString().slice(11, 23);
  const line = `${ts} [${tag}] ${message}${formatData(data)}`;
  console.log(`[PropertySealGPS] ${line}`);
  lines.unshift(line);
  if (lines.length > MAX_LINES) {
    lines.pop();
  }
  listeners.forEach(listener => listener(line));
}

export function subscribeGpsDebug(listener: GpsDebugListener): () => void {
  listeners.add(listener);
  lines.forEach(line => listener(line));
  return () => listeners.delete(listener);
}

export function getGpsDebugLines(): string[] {
  return [...lines];
}

export function clearGpsDebugLog(): void {
  lines.length = 0;
}
