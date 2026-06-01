import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import SummaryScreen from '../src/screens/SummaryScreen';
import type {PendingVisit} from '../src/services/storage';

const safeAreaMetrics = {
  frame: {x: 0, y: 0, width: 390, height: 844},
  insets: {top: 0, left: 0, right: 0, bottom: 0},
};

function renderSummary(props: React.ComponentProps<typeof SummaryScreen>) {
  return render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <SummaryScreen {...props} />
    </SafeAreaProvider>,
  );
}

describe('SummaryScreen', () => {
  test('renders empty state and allows going back', () => {
    const onDone = jest.fn();
    renderSummary({visit: null, onDone});

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

    renderSummary({onDone: jest.fn(), visit});

    expect(screen.getByText('Survey saved')).toBeTruthy();
    expect(screen.getByText('Saved on device')).toBeTruthy();
    fireEvent.press(screen.getByText('OK'));
    fireEvent.press(screen.getByText('View server upload fields'));
    expect(screen.getByText('case_id: 77')).toBeTruthy();
    expect(screen.getByText('plot_category: Commercial')).toBeTruthy();
    fireEvent.press(screen.getByText('Close'));
    expect(screen.getByText('Encroachment')).toBeTruthy();
  });
});
