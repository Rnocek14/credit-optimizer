import { parseTimeEstimateToMinutes } from '../time';

describe('parseTimeEstimateToMinutes', () => {
  it('should return null for empty/null/undefined input', () => {
    expect(parseTimeEstimateToMinutes('')).toBeNull();
    expect(parseTimeEstimateToMinutes(null)).toBeNull();
    expect(parseTimeEstimateToMinutes(undefined)).toBeNull();
    expect(parseTimeEstimateToMinutes('   ')).toBeNull();
  });

  it('should handle basic minute formats', () => {
    expect(parseTimeEstimateToMinutes('30m')).toBe(30);
    expect(parseTimeEstimateToMinutes('45min')).toBe(45);
    expect(parseTimeEstimateToMinutes('60mins')).toBe(60);
    expect(parseTimeEstimateToMinutes('90minutes')).toBe(90);
  });

  it('should handle basic hour formats', () => {
    expect(parseTimeEstimateToMinutes('1hr')).toBe(60);
    expect(parseTimeEstimateToMinutes('2hrs')).toBe(120);
    expect(parseTimeEstimateToMinutes('1hour')).toBe(60);
    expect(parseTimeEstimateToMinutes('3hours')).toBe(180);
    expect(parseTimeEstimateToMinutes('0.5hr')).toBe(30);
    expect(parseTimeEstimateToMinutes('1.5hrs')).toBe(90);
  });

  it('should handle European decimal formats', () => {
    expect(parseTimeEstimateToMinutes('1,5hr')).toBe(90);
    expect(parseTimeEstimateToMinutes('2,25hours')).toBe(135);
  });

  it('should handle complex hour-minute formats', () => {
    expect(parseTimeEstimateToMinutes('1h 15m')).toBe(75);
    expect(parseTimeEstimateToMinutes('2hr 30min')).toBe(150);
    expect(parseTimeEstimateToMinutes('1 hour and 15 minutes')).toBe(75);
    expect(parseTimeEstimateToMinutes('2 hours and 45 mins')).toBe(165);
  });

  it('should handle range formats (lower bound)', () => {
    expect(parseTimeEstimateToMinutes('30–45min')).toBe(30);
    expect(parseTimeEstimateToMinutes('30-45min')).toBe(30);
    expect(parseTimeEstimateToMinutes('2–3hrs')).toBe(120);
    expect(parseTimeEstimateToMinutes('1-2hours')).toBe(60);
  });

  it('should normalize prefixes and symbols', () => {
    expect(parseTimeEstimateToMinutes('~45min')).toBe(45);
    expect(parseTimeEstimateToMinutes('≈ 30 min')).toBe(30);
    expect(parseTimeEstimateToMinutes('about 1hr')).toBe(60);
    expect(parseTimeEstimateToMinutes('  2hrs  ')).toBe(120);
  });

  it('should round decimal results', () => {
    expect(parseTimeEstimateToMinutes('1.7hr')).toBe(102); // 102.0 rounded
    expect(parseTimeEstimateToMinutes('0.33hr')).toBe(20); // 19.8 rounded to 20
  });

  it('should return null for unrecognized formats', () => {
    expect(parseTimeEstimateToMinutes('invalid')).toBeNull();
    expect(parseTimeEstimateToMinutes('5 days')).toBeNull();
    expect(parseTimeEstimateToMinutes('abc123')).toBeNull();
    expect(parseTimeEstimateToMinutes('1 week')).toBeNull();
  });

  it('should handle edge cases', () => {
    expect(parseTimeEstimateToMinutes('0m')).toBe(0);
    expect(parseTimeEstimateToMinutes('0hr')).toBe(0);
    expect(parseTimeEstimateToMinutes('0.1hr')).toBe(6); // 6 minutes
  });
});