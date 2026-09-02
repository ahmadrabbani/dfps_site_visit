import AsyncStorage from '@react-native-async-storage/async-storage';
import {reportServiceError} from './errorReporting';

const PROPERTY_SEAL_VISITS_KEY = 'PROPERTY_SEAL_VISITS';
const LEGACY_CEILING_VISITS_KEY = 'CEILING_INVESTIGATION_VISITS';

export type PropertySealVisitKind = 'seal' | 'deseal';

export interface PropertySealVisit {
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

export async function addPropertySealVisit(visit: PropertySealVisit): Promise<void> {
  const current = await getPropertySealVisits();
  current.unshift(visit);
  await AsyncStorage.setItem(PROPERTY_SEAL_VISITS_KEY, JSON.stringify(current));
}

export async function getPropertySealVisits(): Promise<PropertySealVisit[]> {
  try {
    const raw = await AsyncStorage.getItem(PROPERTY_SEAL_VISITS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    const legacy = await AsyncStorage.getItem(LEGACY_CEILING_VISITS_KEY);
    if (!legacy) {
      return [];
    }
    const parsed = JSON.parse(legacy);
    const visits = Array.isArray(parsed) ? parsed : [];
    await AsyncStorage.setItem(PROPERTY_SEAL_VISITS_KEY, JSON.stringify(visits));
    return visits;
  } catch (e) {
    reportServiceError('propertySealStorage.getPropertySealVisits', e);
    return [];
  }
}
