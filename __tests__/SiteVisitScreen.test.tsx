import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import SiteVisitScreen from '../src/screens/SiteVisitScreen';
import type {SiteVisitViolation} from '../src/services/storage';

describe('SiteVisitScreen', () => {
  test('adds a violation via callback and enables complete action', async () => {
    const onCompleteVisit = jest.fn();

    render(
      <SiteVisitScreen
        user={{id: 1, name: 'Officer A', token: 'token-a'}}
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
              typeLabel: 'Illegal extension',
              area: 100,
            },
          ])
        }
      />,
    );

    fireEvent.press(screen.getByText('+ Add Violation'));
    await waitFor(() => {
      expect(screen.getByText('Illegal extension')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Complete Site Visit'));
    expect(onCompleteVisit).toHaveBeenCalledTimes(1);
  });
});
