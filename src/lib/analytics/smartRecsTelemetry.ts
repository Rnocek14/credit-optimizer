import { logEvent } from '@/lib/analytics';

export function logSmartShown(params: {
  bucket: 'A'|'B'; moduleId: string; weightsVersion?: number|null;
  count: number; topScore?: number|null; avgScore?: number|null;
}) {
  logEvent('smart_recs_shown', params);
}

export function logSmartSelected(params: {
  bucket: 'A'|'B'; moduleId: string; templateId: string;
  smartScore?: number|null; originalRank?: number|null; newRank?: number|null;
  weightsVersion?: number|null;
}) {
  logEvent('template_selected', { ...params, wasReRanked: true });
}

export function logSmartDistribution(moduleId: string, bucket: 'A'|'B', scores: number[], weightsVersion?: number|null) {
  const bins = [ -1, 0.25, 0.5, 0.75, 1.0, 1.25, 2.0 ];
  const hist = Array(bins.length).fill(0);
  for (const s of scores) {
    const idx = bins.findIndex(b => s < b);
    hist[idx === -1 ? hist.length - 1 : Math.max(0, idx)] += 1;
  }
  logEvent('smart_recs_distribution', { moduleId, bucket, weightsVersion, hist, bins });
}
