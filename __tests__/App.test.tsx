/**
 * @format
 */

import React from 'react';
import {render, screen, waitFor} from '@testing-library/react-native';
import App from '../App';

describe('App', () => {
  test('renders login screen after bootstrap', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Login screen')).toBeTruthy();
    });
  });
});
