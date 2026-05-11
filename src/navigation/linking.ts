import {DRAWER_ROUTES, MAIN_STACK_ROUTES, ROOT_ROUTES} from './routeNames';

export const linking = {
  prefixes: ['dfps://', 'https://dfps-site-visit.app'],
  config: {
    screens: {
      [ROOT_ROUTES.Login]: 'login',
      [ROOT_ROUTES.Authenticated]: {
        screens: {
          [DRAWER_ROUTES.Main]: {
            screens: {
              [MAIN_STACK_ROUTES.Dashboard]: 'dashboard',
              [MAIN_STACK_ROUTES.SiteVisit]: 'visit',
              [MAIN_STACK_ROUTES.ViolationForm]: 'violation/new',
              [MAIN_STACK_ROUTES.Summary]: 'visit/summary',
            },
          },
        },
      },
    },
  },
};
