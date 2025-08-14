/**
 * Parses time estimate strings into minutes
 * Handles formats like: "30min", "45m", "1hr", "2–3hrs", "30–45min", "1h 15m"
 * Normalizes mixed strings ("~45min", "≈ 30 min") and trims whitespace
 */
export function parseTimeEstimateToMinutes(input?: string | null): number | null {
  if (!input) return null;
  
  // Normalize and clean input
  let s = input.toLowerCase()
    .replace(/[~≈]/g, '') // Remove approximation symbols
    .replace(/about\s+/g, '') // Remove "about" prefix
    .trim();
  
  if (!s) return null;
  
  // Handle complex hour-minute formats like "1h 15m", "2hr 30min"
  const complexHourMin = s.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hour|hours?)\s+(\d+(?:\.\d+)?)\s*(?:m|min|mins|minutes?)$/);
  if (complexHourMin) {
    const hours = parseFloat(complexHourMin[1]);
    const minutes = parseFloat(complexHourMin[2]);
    return Math.round(hours * 60 + minutes);
  }
  
  // Remove all spaces for simpler parsing
  s = s.replace(/\s+/g, '');
  
  // "30min", "30m"
  const m = s.match(/^(\d+(?:\.\d+)?)m(in)?$/);
  if (m) return Math.round(parseFloat(m[1]));
  
  // "45min", "45minutes"
  const min = s.match(/^(\d+(?:\.\d+)?)(?:minutes?|mins?)$/);
  if (min) return Math.round(parseFloat(min[1]));
  
  // "0.5hr", "1hr", "2hrs", "1hour", "2hours"
  const hr = s.match(/^(\d+(?:\.\d+)?)(?:h|hr|hrs|hour|hours)$/);
  if (hr) return Math.round(parseFloat(hr[1]) * 60);
  
  // "2–3hrs" -> take lower bound
  const rangeHr = s.match(/^(\d+(?:\.\d+)?)[–-](\d+(?:\.\d+)?)(?:h|hr|hrs|hour|hours)$/);
  if (rangeHr) return Math.round(parseFloat(rangeHr[1]) * 60);
  
  // "30–45min" -> take lower bound
  const rangeMin = s.match(/^(\d+(?:\.\d+)?)[–-](\d+(?:\.\d+)?)(?:m|min|mins|minutes)$/);
  if (rangeMin) return Math.round(parseFloat(rangeMin[1]));
  
  return null;
}