/**
 * Parses time estimate strings into minutes
 * Handles formats like: "30min", "45m", "1hr", "2–3hrs", "30–45min"
 */
export function parseTimeEstimateToMinutes(input?: string): number | null {
  if (!input) return null;
  
  const s = input.toLowerCase().replace(/\s+/g, '');
  
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