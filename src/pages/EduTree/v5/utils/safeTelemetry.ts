import { trackTelemetryEvent } from '@/utils/telemetry';

/**
 * Safe telemetry wrapper that never throws
 * Prevents telemetry failures from breaking user flows
 */
export const safeTrack = (...args: Parameters<typeof trackTelemetryEvent>): void => {
  Promise.resolve(trackTelemetryEvent(...args)).catch(e =>
    console.warn('[telemetry] failed', e)
  );
};
