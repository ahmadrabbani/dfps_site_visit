import React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {render, screen, waitFor} from '@testing-library/react-native';
import PropertySealScreen from '../src/screens/PropertySealScreen';
import {fetchBlocks, fetchPhases, fetchPlots, fetchSchemes} from '../src/services/plotBank';

jest.mock('../src/utils/notify', () => ({
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
  notifyInfo: jest.fn(),
  notifyWarning: jest.fn(),
}));

jest.mock('../src/hooks/useSiteVisitGps', () => ({
  useSiteVisitGps: () => ({
    gpsAllowed: true,
    gpsLoading: false,
    gpsError: null,
    gpsPermissionDenied: false,
    currentLat: 31.52,
    currentLng: 74.35,
    needsPermissionPrompt: false,
    handleGetLocation: jest.fn(),
    startLocationFlow: jest.fn(),
    handleOpenLocationSettings: jest.fn(),
  }),
  formatCoord: (value: number | null) => (value != null ? String(value) : '—'),
}));

jest.mock('../src/services/propertySealStorage', () => ({
  addPropertySealVisit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/plotBank', () => ({
  fetchSchemes: jest.fn(),
  fetchPhases: jest.fn(),
  fetchBlocks: jest.fn(),
  fetchPlots: jest.fn(),
}));

const mockSchemes = fetchSchemes as jest.MockedFunction<typeof fetchSchemes>;
const mockPhases = fetchPhases as jest.MockedFunction<typeof fetchPhases>;
const mockBlocks = fetchBlocks as jest.MockedFunction<typeof fetchBlocks>;
const mockPlots = fetchPlots as jest.MockedFunction<typeof fetchPlots>;

function renderScreen(onSaved = jest.fn(), kind: 'seal' | 'deseal' = 'seal') {
  const client = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: {x: 0, y: 0, width: 390, height: 844},
        insets: {top: 0, left: 0, right: 0, bottom: 0},
      }}>
      <QueryClientProvider client={client}>
        <PropertySealScreen
          user={{id: 1, username: 'officer.a', name: 'Officer A', token: 't'}}
          kind={kind}
          onSaved={onSaved}
        />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('PropertySealScreen', () => {
  beforeEach(() => {
    mockSchemes.mockClear();
    mockPhases.mockClear();
    mockBlocks.mockClear();
    mockPlots.mockClear();
    mockSchemes.mockResolvedValue([{value: 'Johar Town', label: 'JOHAR TOWN'}]);
    mockPhases.mockResolvedValue([{value: 'Phase 1', label: 'Phase 1'}]);
    mockBlocks.mockResolvedValue([{value: 'Block A', label: 'Block A'}]);
    mockPlots.mockResolvedValue([{value: '101', label: '12'}]);
  });

  test('keeps save disabled until scheme, plot, activity, and remarks are filled', async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByLabelText('Scheme')).toBeTruthy();
    });
    expect(screen.getByText('Save Property Seal')).toBeDisabled();
    expect(screen.getByText('Property Seal')).toBeTruthy();
    expect(screen.getByLabelText('Add picture field')).toBeTruthy();
  });

  test('loads schemes from plot bank on open', async () => {
    renderScreen();

    await waitFor(() => {
      expect(mockSchemes).toHaveBeenCalled();
      expect(screen.getByText('Select scheme')).toBeTruthy();
    });
    expect(screen.getByText('Select a scheme first')).toBeTruthy();
    expect(mockPhases).not.toHaveBeenCalled();
    expect(mockBlocks).not.toHaveBeenCalled();
    expect(mockPlots).not.toHaveBeenCalled();
  });

  test('deseal form shows pictures and remarks only', async () => {
    renderScreen(jest.fn(), 'deseal');

    await waitFor(() => {
      expect(screen.getByText('Property Deseal')).toBeTruthy();
    });
    expect(screen.queryByLabelText('Scheme')).toBeNull();
    expect(screen.queryByText('Activity')).toBeNull();
    expect(screen.getByLabelText('Final remarks')).toBeTruthy();
    expect(screen.getByLabelText('Add picture field')).toBeTruthy();
    expect(screen.getByText('Save Property Deseal')).toBeDisabled();
    expect(mockSchemes).not.toHaveBeenCalled();
  });
});
