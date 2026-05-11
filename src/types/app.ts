import type {Dispatch, MutableRefObject, SetStateAction} from 'react';
import type {SessionUser} from '../services/api';
import type {SiteVisitViolation} from '../services/storage';

export type SiteScope = 'residential' | 'commercial';

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
