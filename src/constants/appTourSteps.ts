export type AppTourActionCard = {
  title: string;
  description: string;
  icon: string;
};

export type AppTourStep =
  | {
      id: 'welcome';
      kind: 'welcome';
      title: string;
      body: string;
      icon: string;
    }
  | {
      id: 'actions';
      kind: 'actions';
      title: string;
      body: string;
      actions: AppTourActionCard[];
    }
  | {
      id: 'menu';
      kind: 'standard';
      title: string;
      body: string;
      icon: string;
    }
  | {
      id: 'done';
      kind: 'done';
      title: string;
      body: string;
      icon: string;
    };

export const APP_TOUR_STEPS: AppTourStep[] = [
  {
    id: 'welcome',
    kind: 'welcome',
    title: 'Welcome to DFPS Site Visit',
    body:
      'This short tour shows the two main things you will do in the app: record a site visit on-site, and send saved surveys to the server.',
    icon: 'map-marker-check-outline',
  },
  {
    id: 'actions',
    kind: 'actions',
    title: 'Your two main actions',
    body: 'Use these from the Dashboard or open the menu (☰) at any time:',
    actions: [
      {
        title: 'DFPS Site Visit',
        description:
          'Start a completion certificate survey. Allow GPS, pick the case, record violations or a clear visit, then save.',
        icon: 'map-marker-check-outline',
      },
      {
        title: 'My Site Visits & Submissions',
        description:
          'See surveys saved on this device and push them to the server when you are online.',
        icon: 'cloud-upload-outline',
      },
    ],
  },
  {
    id: 'menu',
    kind: 'standard',
    title: 'Navigation menu',
    body:
      'Swipe from the left edge of the screen or tap the menu icon (☰) in the top bar to open the drawer. You can switch screens, sync pending visits, sign out, or open this tour again.',
    icon: 'menu',
  },
  {
    id: 'done',
    kind: 'done',
    title: "You're ready",
    body: 'Start a site visit from the Dashboard when you arrive on site. Check My Submissions to upload saved visits.',
    icon: 'check-circle-outline',
  },
];

export const APP_TOUR_STEP_COUNT = APP_TOUR_STEPS.length;
