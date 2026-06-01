import {useMutation, useQueryClient} from '@tanstack/react-query';
import type {NavigationProp} from '@react-navigation/native';
import {addPendingVisit, type PendingVisit} from '../services/storage';
import {syncPending} from '../services/syncService';
import type {SessionUser} from '../services/api';
import type {CcSurveyCompletePayload} from '../types/app';
import {uploadCopy} from '../constants/uploadCopy';
import {MAIN_STACK_ROUTES} from '../navigation/routeNames';
import {invalidateVisitCaches} from '../queries/invalidateVisitCaches';
import {notifyError} from '../utils/notify';

export interface SubmitSiteVisitInput {
  user: SessionUser;
  survey: CcSurveyCompletePayload;
}

export interface SubmitSiteVisitResult {
  visit: PendingVisit;
  uploadedToApi: boolean;
  uploadError: string | null;
}

function buildPendingVisit(user: SessionUser, survey: CcSurveyCompletePayload): PendingVisit {
  const now = new Date().toISOString();
  return {
    localId: 'local-' + Date.now(),
    siteId: 1,
    caseId: survey.caseId,
    caseNumber: survey.caseLabel,
    officerId: user.id,
    visitByName: user.name,
    authToken: user.token,
    startTime: now,
    endTime: now,
    startLat: survey.coords.lat,
    startLon: survey.coords.lng,
    scope: survey.scope,
    isViolation: survey.isViolation,
    noOfFloors: survey.noOfFloors,
    remarks: survey.remarks,
    mainImageUri: survey.mainImageUri,
    violations: survey.violations,
  };
}

export function useSubmitSiteVisitMutation(navigation: NavigationProp<Record<string, object | undefined>>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({user, survey}: SubmitSiteVisitInput): Promise<SubmitSiteVisitResult> => {
      const visit = buildPendingVisit(user, survey);
      await addPendingVisit(visit);

      let uploadedToApi = false;
      let uploadError: string | null = null;

      try {
        const syncResult = await syncPending({skipNotifications: true});
        uploadedToApi = syncResult.uploaded > 0;
        if (uploadedToApi) {
          // Toasts handled in onSuccess
        } else if (syncResult.failed > 0) {
          uploadError = uploadCopy.uploadFailedRetry;
        }
        return {visit, uploadedToApi, uploadError};
      } catch (e) {
        uploadError = (e as Error).message;
        return {visit, uploadedToApi: false, uploadError};
      }
    },
    onError: error => {
      notifyError((error as Error).message || 'Could not save survey.');
    },
    onSuccess: result => {
      invalidateVisitCaches(queryClient, {
        serverPushSucceeded: result.uploadedToApi,
      });

      navigation.navigate(MAIN_STACK_ROUTES.Summary, {
        visit: result.visit,
        uploadedToApi: result.uploadedToApi,
        uploadError: result.uploadError,
      });
    },
  });
}
