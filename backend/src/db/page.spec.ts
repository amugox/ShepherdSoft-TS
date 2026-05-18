import { clampPage, pageResult } from './page';

describe('clampPage', () => {
  it('defaults to page 1, size 25, offset 0 when nothing is supplied', () => {
    expect(clampPage()).toEqual({ page: 1, pageSize: 25, offset: 0 });
    expect(clampPage(null)).toEqual({ page: 1, pageSize: 25, offset: 0 });
    expect(clampPage({})).toEqual({ page: 1, pageSize: 25, offset: 0 });
  });

  it('caps pageSize at the server maximum of 100', () => {
    expect(clampPage({ pageSize: 500 }).pageSize).toBe(100);
  });

  it('floors pageSize to a minimum of 1', () => {
    expect(clampPage({ pageSize: 0 }).pageSize).toBe(1);
    expect(clampPage({ pageSize: -10 }).pageSize).toBe(1);
  });

  it('floors page to a minimum of 1', () => {
    expect(clampPage({ page: 0 }).page).toBe(1);
    expect(clampPage({ page: -3 }).page).toBe(1);
  });

  it('computes offset from clamped page and size', () => {
    expect(clampPage({ page: 3, pageSize: 25 }).offset).toBe(50);
    expect(clampPage({ page: 2, pageSize: 50 }).offset).toBe(50);
  });

  it('floors fractional inputs', () => {
    expect(clampPage({ page: 2.9, pageSize: 25.7 })).toEqual({
      page: 2,
      pageSize: 25,
      offset: 25,
    });
  });
});

describe('pageResult', () => {
  it('wraps rows and total into the page envelope', () => {
    const clamped = clampPage({ page: 2, pageSize: 10 });
    expect(pageResult(['a', 'b'], 42, clamped)).toEqual({
      rows: ['a', 'b'],
      total: 42,
      page: 2,
      pageSize: 10,
    });
  });
});
