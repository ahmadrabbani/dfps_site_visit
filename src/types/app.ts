import type {Dispatch, MutableRefObject, SetStateAction} from 'react';
import type {SessionUser} from '../services/api';
import type {SiteVisitViolation} from '../services/storage';

export type SiteScope = 'residential' | 'commercial';

export type ViolationChoice = 'yes' | 'no' | '';

export interface CcSurveyCompletePayload {
  caseId: string;
  caseLabel: string;
  isViolation: boolean;
  noOfFloors: number;
  remarks: string;
  mainImageUri: string | null;
  violations: SiteVisitViolation[];
  scope: SiteScope;
  coords: {lat: number; lng: number};
}

export type SetViolations = Dispatch<SetStateAction<SiteVisitViolation[]>>;

export interface ViolationDraft {
  currentViolations: SiteVisitViolation[];
  setViolations: SetViolations;
}

export interface AuthNavigationContextValue {
  user: SessionUser;
  siteScope: SiteScope;
  setSiteScope: (scope: SiteScope) => void;
  violationDraftRef: MutableRefObject<ViolationDraft | null>;
  onSignOut: () => void | Promise<void>;
}
