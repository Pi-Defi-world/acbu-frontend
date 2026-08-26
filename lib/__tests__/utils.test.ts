import { describe, it, expect } from 'vitest';
import { parseUtcDate } from '../utils';

describe('parseUtcDate', () => {
  it('should parse ISO strings with Z suffix correctly', () => {
    const dateStr = '2026-05-28T01:17:35Z';
    const date = parseUtcDate(dateStr);
    expect(date.toISOString()).toBe('2026-05-28T01:17:35.000Z');
  });

  it('should parse ISO strings with offset suffix correctly', () => {
    const dateStr = '2026-05-28T02:17:35+01:00';
    const date = parseUtcDate(dateStr);
    expect(date.toISOString()).toBe('2026-05-28T01:17:35.000Z');
  });

  it('should parse UTC strings without suffix correctly by forcing Z', () => {
    const dateStr = '2026-05-28 01:17:35';
    const date = parseUtcDate(dateStr);
    expect(date.toISOString()).toBe('2026-05-28T01:17:35.000Z');
  });

  it('should return a valid Date when passed null or undefined', () => {
    const date1 = parseUtcDate(null);
    expect(date1).toBeInstanceOf(Date);
    const date2 = parseUtcDate(undefined);
    expect(date2).toBeInstanceOf(Date);
  });
});
