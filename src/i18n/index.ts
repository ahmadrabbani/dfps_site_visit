import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

const resources = {
  en: {
    translation: {
      app_name: 'LDA DFPS',
    },
  },
  ur: {
    translation: {
      app_name: 'LDA DFPS',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: {escapeValue: false},
});

export default i18n;
