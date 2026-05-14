import { normRow, normRows, okSp, type SpRow } from './types';

describe('SP row helpers', () => {
  it('normRow lowercases PascalCase keys', () => {
    const out = normRow<SpRow>({ RespStatus: 0, RespMessage: 'OK', Data1: 'X' });
    expect(out).toEqual({ resp_status: 0, resp_message: 'OK', data1: 'X' });
  });

  it('normRow passes through already-lowercase keys', () => {
    const out = normRow<SpRow>({ resp_status: 1, resp_message: 'err' });
    expect(out).toEqual({ resp_status: 1, resp_message: 'err' });
  });

  it('normRow returns undefined for non-objects', () => {
    expect(normRow(null)).toBeUndefined();
    expect(normRow(undefined)).toBeUndefined();
    expect(normRow(42)).toBeUndefined();
  });

  it('normRows drops null/undefined rows', () => {
    const out = normRows<SpRow>([null, { RespStatus: 0, RespMessage: 'a' }, undefined]);
    expect(out).toHaveLength(1);
    expect(out[0]?.resp_message).toBe('a');
  });

  it('okSp accepts only resp_status === 0', () => {
    expect(okSp({ resp_status: 0, resp_message: 'ok' })).toBe(true);
    expect(okSp({ resp_status: 1, resp_message: 'no' })).toBe(false);
    expect(okSp(undefined)).toBe(false);
  });
});
