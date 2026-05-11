import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import SummaryScreen from '../src/screens/SummaryScreen';
import type {PendingVisit} from '../src/services/storage';

describe('SummaryScreen', () => {
  test('renders empty state and allows going back', () => {
    const onDone = jest.fn();
    render(<SummaryScreen visit={null} onDone={onDone} />);

    expect(screen.getByText('No visit data')).toBeTruthy();
    fireEvent.press(screen.getByText('Back to Dashboard'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('renders completed visit details', () => {
    const visit: PendingVisit = {
      localId: 'visit-77',
      siteId: 77,
      officerId: 1,
      authToken: 'token',
      startTime: '2026-01-01T10:00:00.000Z',
      endTime: '2026-01-01T10:10:00.000Z',
      startLat: 31.5,
      startLon: 74.3,
      scope: 'commercial',
      retryCount: 0,
      nextRetryAt: 0,
      paused: false,
      lastError: '',
      violations: [{typeLabel: 'Encroachment', area: 240, notes: 'Front setback blocked'}],
    };

    render(
      <SummaryScreen onDone={jest.fn()} visit={visit} />,
    );

    expect(screen.getByText('Site Visit Completed')).toBeTruthy();
    expect(screen.getByText('Site ID: 77')).toBeTruthy();
    expect(screen.getByText('Schedule: commercial')).toBeTruthy();
    expect(screen.getByText('Violations recorded: 1')).toBeTruthy();
    expect(screen.getByText('Encroachment')).toBeTruthy();
  });
});
