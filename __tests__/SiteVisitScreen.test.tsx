import React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import SiteVisitScreen from '../src/screens/SiteVisitScreen';
import {fetchCaseList} from '../src/services/api';
import type {SiteVisitViolation} from '../src/services/storage';

jest.mock('../src/services/api', () => {
  const actual = jest.requireActual('../src/services/api');
  return {
    ...actual,
    fetchCaseList: jest.fn(),
  };
});

const mockFetchCaseList = fetchCaseList as jest.MockedFunction<typeof fetchCaseList>;

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('SiteVisitScreen', () => {
  beforeEach(() => {
    mockFetchCaseList.mockResolvedValue([
      {id: '101', owc: 'Case-101 / Plot A'},
      {id: '102', owc: 'Case-102 / Plot B'},
    ]);
  });

  test('completes CC survey when case, violation, and floors are filled', async () => {
    const onCompleteVisit = jest.fn();

    renderWithQuery(
      <SiteVisitScreen
        user={{id: 1, username: 'officer.a', name: 'Officer A', token: 'token-a'}}
        siteScope="residential"
        onScopeChange={jest.fn()}
        onCompleteVisit={onCompleteVisit}
        onAddViolation={(
          currentViolations: SiteVisitViolation[],
          setViolations: React.Dispatch<React.SetStateAction<SiteVisitViolation[]>>,
        ) =>
          setViolations([
            ...currentViolations,
            {
              violationTypeId: 30,
              typeLabel: 'Illegal extension',
              floorLabel: 'GF',
              unit: 'sqft',
              width: 10,
              length: 12,
            },
          ])
        }
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Case-101 / Plot A')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Case-101 / Plot A'));
    fireEvent.press(screen.getByText('Yes — Violation'));
    fireEvent.press(screen.getByText('Add Violation'));

    await waitFor(() => {
      expect(screen.getByText('Illegal extension')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText(/Enter 1/), '3');

    await waitFor(() => {
      expect(screen.getByText('Save Survey')).not.toBeDisabled();
    });

    fireEvent.press(screen.getByText('Save Survey'));

    await waitFor(() => {
      expect(onCompleteVisit).toHaveBeenCalledTimes(1);
    });

    expect(onCompleteVisit).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: '101',
        caseLabel: 'Case-101 / Plot A',
        isViolation: true,
        noOfFloors: 3,
        scope: 'residential',
        coords: {lat: 31.5204, lng: 74.3587},
        violations: expect.arrayContaining([
          expect.objectContaining({typeLabel: 'Illegal extension', floorLabel: 'GF', unit: 'sqft'}),
        ]),
      }),
    );
  });

  test('cannot choose violation until a case is selected', async () => {
    renderWithQuery(
      <SiteVisitScreen
        user={{id: 1, username: 'officer.a', name: 'Officer A', token: 'token-a'}}
        siteScope="residential"
        onScopeChange={jest.fn()}
        onCompleteVisit={jest.fn()}
        onAddViolation={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Case-101 / Plot A')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Yes — Violation'));
    expect(screen.queryByText('Add Violation')).toBeNull();
    expect(screen.getByText('Select an application case above before answering.')).toBeTruthy();

    fireEvent.press(screen.getByText('Case-101 / Plot A'));
    fireEvent.press(screen.getByText('Yes — Violation'));
    expect(screen.getByText('Add Violation')).toBeTruthy();
  });
});
