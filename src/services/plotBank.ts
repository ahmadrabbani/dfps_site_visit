import {getPlotBankUrl} from '../config/env';

export type PlotBankOption = {
  value: string;
  label: string;
};

/** Same encoding as housingportal/survey_data_v3.php: base64_encode(base64_encode($name)). */
export function phpDoubleBase64(value: string): string {
  const encode = (input: string): string => {
    if (typeof globalThis.btoa === 'function') {
      return globalThis.btoa(unescape(encodeURIComponent(input)));
    }
    return input;
  };
  return encode(encode(value));
}

function firstBucket(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.length > 0 ? payload[0] : [];
  }
  if (payload && typeof payload === 'object') {
    const row = payload as Record<string, unknown>;
    if (row[0] != null) {
      return row[0];
    }
  }
  return payload;
}

function parseSurveyListError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const row = payload as {IS_ERR?: string | number; ERR?: string; error?: string};
  if (String(row.IS_ERR ?? '') === '1') {
    return row.ERR || 'Invalid Access';
  }
  if (typeof row.error === 'string' && row.error.trim()) {
    return row.error;
  }
  return null;
}

export function parseSchemeOptions(payload: unknown): PlotBankOption[] {
  const listError = parseSurveyListError(payload);
  if (listError) {
    throw new Error(listError);
  }
  const bucket = firstBucket(payload);
  const rows = Array.isArray(bucket) ? bucket : [];
  const options: PlotBankOption[] = [];
  rows.forEach(item => {
    const raw = String(item ?? '').trim();
    if (!raw) {
      return;
    }
    const name = raw.split('@')[0].trim();
    if (!name) {
      return;
    }
    options.push({value: name, label: name.toUpperCase()});
  });
  return options;
}

export function parseNamedOptions(payload: unknown): PlotBankOption[] {
  const listError = parseSurveyListError(payload);
  if (listError) {
    throw new Error(listError);
  }
  const bucket = firstBucket(payload);
  if (Array.isArray(bucket)) {
    return bucket
      .map(item => String(item ?? '').trim())
      .filter(Boolean)
      .map(name => ({value: name, label: name}));
  }
  if (bucket && typeof bucket === 'object') {
    return Object.values(bucket as Record<string, unknown>)
      .map(item => String(item ?? '').trim())
      .filter(Boolean)
      .map(name => ({value: name, label: name}));
  }
  return [];
}

export function parsePlotOptions(payload: unknown): PlotBankOption[] {
  const listError = parseSurveyListError(payload);
  if (listError) {
    throw new Error(listError);
  }
  const bucket = firstBucket(payload);
  if (!bucket || typeof bucket !== 'object') {
    return [];
  }
  return Object.entries(bucket as Record<string, unknown>)
    .map(([id, plotNo]) => {
      const label = String(plotNo ?? '').trim();
      const value = String(id ?? '').trim();
      if (!value || !label) {
        return null;
      }
      return {value, label};
    })
    .filter((item): item is PlotBankOption => item != null);
}

async function fetchPlotBankJson(params: Record<string, string>, label: string): Promise<unknown> {
  const url = `${getPlotBankUrl()}?${new URLSearchParams({v: '12', ...params}).toString()}`;
  let res: Response;
  try {
    res = await fetch(url, {method: 'GET', headers: {Accept: 'application/json'}});
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`${label}: ${detail}`);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${label}: HTTP ${res.status} ${text}`.trim());
  }
  return res.json() as Promise<unknown>;
}

export async function fetchSchemes(): Promise<PlotBankOption[]> {
  const payload = await fetchPlotBankJson({t: '1'}, 'Scheme list');
  return parseSchemeOptions(payload);
}

export async function fetchPhases(schemeName: string): Promise<PlotBankOption[]> {
  const payload = await fetchPlotBankJson(
    {t: '2', scheme: phpDoubleBase64(schemeName)},
    'Phase list',
  );
  return parseNamedOptions(payload);
}

export async function fetchBlocks(schemeName: string, phaseName: string): Promise<PlotBankOption[]> {
  const payload = await fetchPlotBankJson(
    {
      t: '3',
      scheme: phpDoubleBase64(schemeName),
      phase: phpDoubleBase64(phaseName),
    },
    'Block list',
  );
  return parseNamedOptions(payload);
}

export async function fetchPlots(
  schemeName: string,
  phaseName: string,
  blockName: string,
): Promise<PlotBankOption[]> {
  const payload = await fetchPlotBankJson(
    {
      t: '4',
      scheme: phpDoubleBase64(schemeName),
      phase: phpDoubleBase64(phaseName),
      sector: phpDoubleBase64(blockName),
    },
    'Plot list',
  );
  return parsePlotOptions(payload);
}
