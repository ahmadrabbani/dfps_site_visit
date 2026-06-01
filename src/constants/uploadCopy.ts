/** User-facing copy for sending site visits to the server. */
export const uploadCopy = {
  pushAllPending: 'Push My Site Visit Data to Server',
  pushOneNow: 'Push to Server Now',
  pushingOne: 'Sending to server...',
  retryFailed: 'Server Upload Retry Failed',
  savedPushFromSubmissions:
    'Survey saved on this device. Push from My Site Visits & Submissions when online.',
  uploadFailedRetry: 'Upload failed. Push from My Site Visits & Submissions when online.',
  pushedToServer: 'Site visit data sent to the server.',
  summaryPending:
    'Saved on this device only. Open My Site Visits & Submissions → Push to Server Now.',
  nothingToPush: 'No site visits waiting to send.',
  sentCount: (n: number) =>
    n === 1 ? '1 site visit sent to the server.' : `${n} site visit(s) sent to the server.`,
  drawerSync: 'Push to Server',
  drawerUnsynced: (n: number) =>
    `${n} visit${n === 1 ? '' : 's'} not on server yet`,
};
