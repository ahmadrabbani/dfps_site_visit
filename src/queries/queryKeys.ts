import type {SiteScope} from '../types/app';

export const queryKeys = {
  pendingVisits: ['pendingVisits'] as const,
  ccCases: (username: string, scope: SiteScope) => ['ccCases', username, scope] as const,
  ccCasesPrefix: ['ccCases'] as const,
  violationTypes: (scope: SiteScope) => ['violationTypes', scope] as const,
};
