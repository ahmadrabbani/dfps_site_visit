import AsyncStorage from '@react-native-async-storage/async-storage';
import {reportServiceError} from './errorReporting';

const CEILING_VISITS_KEY = 'CEILING_INVESTIGATION_VISITS';

export type PropertySealVisitKind = 'seal' | 'deseal';

export interface CeilingInvestigationVisit {
  localId: string;
  kind?: PropertySealVisitKind;
  officerId: number | string;
  officerName: string;
  scheme: string;
  phase: string;
  block: string;
  plot: string;
  activityValue: string;
  activityLabel: string;
  finalRemarks: string;
  photoUris: string[];
  lat: number | null;
  lng: number | null;
  savedAt: string;
}

export async function addCeilingInvestigationVisit(visit: CeilingInvestigationVisit): Promise<void> {
  const current = await getCeilingInvestigationVisits();
  current.unshift(visit);
  await AsyncStorage.setItem(CEILING_VISITS_KEY, JSON.stringify(current));
}

export async function getCeilingInvestigationVisits(): Promise<CeilingInvestigationVisit[]> {
  try {
    const raw = await AsyncStorage.getItem(CEILING_VISITS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    reportServiceError('ceilingStorage.getCeilingInvestigationVisits', e);
    return [];
  }
}
