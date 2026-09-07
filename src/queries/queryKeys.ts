import type {SiteScope} from '../types/app';

export const queryKeys = {
  pendingVisits: ['pendingVisits'] as const,
  pendingPropertySealVisits: ['pendingPropertySealVisits'] as const,
  ccCases: (username: string, scope: SiteScope) => ['ccCases', username, scope] as const,
  ccCasesPrefix: ['ccCases'] as const,
  violationTypes: (scope: SiteScope) => ['violationTypes', scope] as const,
  plotSchemes: ['plotSchemes'] as const,
  plotPhases: (scheme: string) => ['plotPhases', scheme] as const,
  plotBlocks: (scheme: string, phase: string) => ['plotBlocks', scheme, phase] as const,
  plotPlots: (scheme: string, phase: string, block: string) =>
    ['plotPlots', scheme, phase, block] as const,
};
