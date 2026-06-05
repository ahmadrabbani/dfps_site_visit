jest.mock('../config/env', () => ({
  BYPASS_LOGIN: true,
  getBypassLoginUsername: () => 'junaid.tp3',
  getLoginUrl: () => 'http://test.example/login.php',
  getViolationListUrl: () => 'http://test.example/cc_violation_list.php',
  getCcApplicationListUrl: () => 'http://test.example/cc_application_list.php',
  getCcPortalSubmitUrl: () => 'http://test.example/conf_add.php',
  getCcSurveyUrl: () => 'http://test.example/forward.php',
  getSurveyApiSecret: () => 'secret',
  USE_FAKE_API: false,
}));

import {
  buildPortalCcSurveyTextFields,
  parsePortalCcSubmitResponse,
} from './portalCcSurvey';
import {
  createBypassLoginUser,
  createDevTestLoginUser,
  isTestModeSession,
  login,
  mapCcViolationList,
  matchesDevTestLogin,
  parseLegacyLoginResponse,
} from './api';
import type {PendingVisitBase} from './storage';

describe('isTestModeSession', () => {
  it('is true only for dev or bypass sessions', () => {
    expect(isTestModeSession(createDevTestLoginUser('junaid.tp3'))).toBe(true);
    expect(isTestModeSession({id: 1, username: 'a', name: 'A', token: 't'})).toBe(false);
    expect(isTestModeSession({id: 1, username: 'a', name: 'A', token: 't', isDevTestLogin: false})).toBe(
      false,
    );
  });
});

describe('dev test login', () => {
  it('matches any non-empty username when bypass is enabled', () => {
    expect(matchesDevTestLogin('junaid.tp3')).toBe(true);
    expect(matchesDevTestLogin('JUNAID.TP3')).toBe(true);
    expect(matchesDevTestLogin('admin')).toBe(true);
    expect(matchesDevTestLogin('')).toBe(false);
  });

  it('signs in any username with any password when bypass is enabled and login fails', async () => {
    await expect(login('junaid.tp3', 'anything')).resolves.toEqual(createDevTestLoginUser('junaid.tp3'));
    await expect(login('officer.two', 'secret')).resolves.toEqual(createDevTestLoginUser('officer.two'));
  });
});

describe('createBypassLoginUser', () => {
  it('builds a dev session for CC list API testing', () => {
    expect(createBypassLoginUser('junaid.tp3')).toEqual({
      id: 'bypass',
      username: 'junaid.tp3',
      name: 'junaid.tp3 (login bypass)',
      token: 'bypass',
      portalCookie: null,
      isBypassLogin: true,
    });
  });
});

describe('parseLegacyLoginResponse', () => {
  it('accepts successful legacy login array', () => {
    expect(
      parseLegacyLoginResponse(
        ['1', 'Success!', 'Login Successfully', 'success', 'index_admin.php?chkp=1'],
        'officer1',
      ),
    ).toEqual({
      id: 'officer1',
      username: 'officer1',
      name: 'officer1',
      token: 'officer1',
      isDevTestLogin: false,
      isBypassLogin: false,
    });
  });

  it('uses log_id and log_name when PHP appends them', () => {
    expect(
      parseLegacyLoginResponse(
        ['1', 'Success!', 'Login Successfully', 'success', 'index_admin.php?chkp=1', '2125', 'Ali Khan'],
        '2125',
      ),
    ).toEqual({
      id: '2125',
      username: '2125',
      name: 'Ali Khan',
      token: '2125',
      isDevTestLogin: false,
      isBypassLogin: false,
    });
  });

  it('uses numeric username as officer id when log_id omitted', () => {
    expect(
      parseLegacyLoginResponse(
        ['1', 'Success!', 'Login Successfully', 'success', 'index_admin.php?chkp=1'],
        '2125',
      ),
    ).toEqual({
      id: 2125,
      username: '2125',
      name: '2125',
      token: '2125',
      isDevTestLogin: false,
      isBypassLogin: false,
    });
  });

  it('throws with server message on failure array', () => {
    expect(() =>
      parseLegacyLoginResponse(['0', 'Error!', 'Invalid password', 'error'], 'officer1'),
    ).toThrow('Invalid password');
  });
});

describe('mapCcViolationList', () => {
  it('maps cc_violation_list.php rows to penalty types', () => {
    const result = mapCcViolationList([
      {vid: '30', vtype: 'Change of Side (Above 1 Kanal) Commercial'},
      {vid: '35', vtype: 'Penalty Not Applicable/ No Violation Observed'},
    ]);

    expect(result).toEqual([
      {
        id: 30,
        name: 'Change of Side (Above 1 Kanal) Commercial',
        categories: [{id: 30, name: 'General', isFixedAmount: true}],
      },
      {
        id: 35,
        name: 'Penalty Not Applicable/ No Violation Observed',
        categories: [{id: 35, name: 'General', isFixedAmount: true}],
      },
    ]);
  });

  it('skips invalid rows', () => {
    expect(mapCcViolationList([{vid: '', vtype: 'Bad'}, {vid: '10', vtype: ''}])).toEqual([]);
  });
});

describe('buildPortalCcSurveyTextFields', () => {
  const baseVisit: PendingVisitBase = {
    localId: 'local-1',
    siteId: 42,
    caseId: '101',
    caseNumber: 'OWC-101',
    officerId: 7,
    visitByName: 'Officer Ali',
    authToken: 'token',
    startTime: '2026-01-01T00:00:00.000Z',
    endTime: '2026-01-01T00:05:00.000Z',
    startLat: 31.52,
    startLon: 74.35,
    scope: 'commercial',
    isViolation: true,
    noOfFloors: 3,
    remarks: 'Site clear',
    violations: [
      {
        violationTypeId: 30,
        typeLabel: 'Change of Side',
        floorLabel: 'GF',
        unit: 'sqft',
        width: 10,
        length: 12,
        notes: 'Observed',
      },
    ],
  };

  it('maps violation survey to portal form field names', () => {
    expect(buildPortalCcSurveyTextFields(baseVisit)).toEqual({
      caseId: '101',
      case_number: 'OWC-101',
      plot_category: 'Commercial',
      is_violation: '1',
      no_of_floors: '3',
      user_lat: '31.52',
      user_lng: '74.35',
      site_position: 'Site clear',
    });
  });

  it('maps no-violation survey to no_violation_remarks', () => {
    expect(
      buildPortalCcSurveyTextFields({
        ...baseVisit,
        isViolation: false,
        violations: [],
        remarks: 'All good',
      }),
    ).toMatchObject({
      is_violation: '0',
      no_violation_remarks: 'All good',
    });
  });
});

describe('parsePortalCcSubmitResponse', () => {
  it('accepts portal success array', () => {
    expect(
      parsePortalCcSubmitResponse(['1', 'success', 'Visit stored and synced successfully']),
    ).toEqual({
      ok: true,
      serverMessage: 'Visit stored and synced successfully',
    });
  });

  it('throws on portal error array', () => {
    expect(() =>
      parsePortalCcSubmitResponse(['0', 'err', 'Remarks are required for No Violation cases.']),
    ).toThrow('Remarks are required for No Violation cases.');
  });
});
