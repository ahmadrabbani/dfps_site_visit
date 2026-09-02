jest.mock('../config/env', () => ({
  getPlotBankUrl: () => 'http://test.example/plot_bank.php',
}));

import {parseNamedOptions, parsePlotOptions, parseSchemeOptions, phpDoubleBase64} from './plotBank';

describe('plotBank parsers', () => {
  it('encodes names the same way as survey_data_v3.php', () => {
    expect(phpDoubleBase64('JOHAR TOWN')).toBe(globalThis.btoa(globalThis.btoa('JOHAR TOWN')));
  });

  it('parses scheme names from plot_bank t=1 rows', () => {
    const options = parseSchemeOptions([['Johar Town@12', 'Valencia@9', '']]);
    expect(options).toEqual([
      {value: 'Johar Town', label: 'JOHAR TOWN'},
      {value: 'Valencia', label: 'VALENCIA'},
    ]);
  });

  it('parses phase/block string lists from t=2 / t=3', () => {
    expect(parseNamedOptions([['Phase 1', 'Phase 2']])).toEqual([
      {value: 'Phase 1', label: 'Phase 1'},
      {value: 'Phase 2', label: 'Phase 2'},
    ]);
  });

  it('parses plot id → number map from t=4', () => {
    expect(parsePlotOptions([{101: '12', 102: '13-A'}])).toEqual([
      {value: '101', label: '12'},
      {value: '102', label: '13-A'},
    ]);
  });
});
