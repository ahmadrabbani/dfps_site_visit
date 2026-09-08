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
      id: 'propertySeal';
      kind: 'standard';
      title: string;
      body: string;
      icon: string;
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
      'This tour covers Completion Certificate site visits, Property Seal & Deseal, and how to upload saved work from the menu.',
    icon: 'map-marker-check-outline',
  },
  {
    id: 'actions',
    kind: 'actions',
    title: 'Your main actions',
    body: 'Open these from the Dashboard or the menu (☰):',
    actions: [
      {
        title: 'DFPS Site Visit',
        description:
          'Completion certificate survey: allow GPS, pick the case, record violations or a clear visit, then save.',
        icon: 'map-marker-check-outline',
      },
      {
        title: 'Property Seal & Deseal',
        description:
          'Enforcement form: get GPS (≤50 m), fill scheme/plot/activity for Seal, or photos and remarks for Deseal.',
        icon: 'home-lock',
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
    id: 'propertySeal',
    kind: 'standard',
    title: 'Property Seal & Deseal',
    body:
      'From the menu, open Property Seal & Deseal. Choose Seal or Deseal first, then Get location (accuracy must be 50 m or better). For Seal, pick scheme, plot, and activity. For Deseal, add photos and remarks. Save when ready — work uploads when online.',
    icon: 'home-lock',
  },
  {
    id: 'menu',
    kind: 'standard',
    title: 'Navigation menu',
    body:
      'Swipe from the left edge or tap ☰ to open the drawer. Switch screens, sync pending visits, sign out, or start this tour again anytime.',
    icon: 'menu',
  },
  {
    id: 'done',
    kind: 'done',
    title: "You're ready",
    body:
      'Use DFPS Site Visit for completion certificates, or Property Seal & Deseal for sealing work. Check My Submissions to upload anything still on the device.',
    icon: 'check-circle-outline',
  },
];

export const APP_TOUR_STEP_COUNT = APP_TOUR_STEPS.length;
