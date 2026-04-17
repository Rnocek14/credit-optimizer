// Vitest coverage for the prePromotePolicyPack normalizer.
import { describe, it, expect } from 'vitest';
import {
  prePromotePolicyPack,
  type FlatProvenance,
  type FlatPolicyData,
} from '../../../supabase/functions/_shared/prePromotePolicyPack.ts';

const baseProv = (): FlatProvenance => ({
  residency_credits: {
    source: 'ai_extraction',
    confidence: 80,
    source_url: 'https://example.edu/residency',
    source_text: '25% of degree must be earned at the institution',
  },
  max_transfer_credits: {
    source: 'ai_extraction',
    confidence: 75,
    source_url: 'https://example.edu/transfer',
    source_text: 'Up to 90 credits may transfer',
  },
});

describe('prePromotePolicyPack', () => {
  it('clamps out-of-range confidence into [0,100]', () => {
    const policyData: FlatPolicyData = {
      residency_credits: '30',
      max_transfer_credits: '90',
      transfer_alt_bucket_mode: 'separate',
      degree_credit_total: 120,
    };
    const fieldProvenance = baseProv();
    fieldProvenance.residency_credits.confidence = 150; // out of range
    fieldProvenance.max_transfer_credits.confidence = -10;

    const out = prePromotePolicyPack({
      policyData,
      fieldProvenance,
      totalScore: 80,
      hasGroundTruth: false,
    });

    expect(out.fieldProvenance.residency_credits.confidence).toBe(100);
    expect(out.fieldProvenance.max_transfer_credits.confidence).toBe(0);
    expect(out.normalizationApplied.some((a) => a.type === 'confidence_clamped')).toBe(true);
  });

  it('caps derived/auto_normalized confidence at 90', () => {
    const fieldProvenance: FlatProvenance = {
      residency_credits: {
        source: 'derived',
        confidence: 95,
        source_url: 'https://example.edu/x',
      },
    };
    const out = prePromotePolicyPack({
      policyData: { residency_credits: '30' },
      fieldProvenance,
      totalScore: 80,
      hasGroundTruth: false,
    });
    expect(out.fieldProvenance.residency_credits.confidence).toBe(90);
  });

  it('coerces numeric strings and drops malformed values', () => {
    const policyData: FlatPolicyData = {
      residency_credits: '  30  ',
      max_transfer_credits: '1-800',
      max_ace_nccrs_credits: 30,
      transfer_alt_bucket_mode: 'separate',
      degree_credit_total: 120,
    };
    const out = prePromotePolicyPack({
      policyData,
      fieldProvenance: baseProv(),
      totalScore: 80,
      hasGroundTruth: false,
    });
    expect(out.policyData.residency_credits).toBe('30');
    expect(out.policyData.max_transfer_credits).toBeNull();
    expect(out.policyData.max_ace_nccrs_credits).toBe('30');
    const dropped = out.normalizationApplied.find((a) => a.type === 'numeric_string_dropped');
    expect(dropped?.field).toBe('max_transfer_credits');
  });

  it('derives combined cap = min(transfer+alt, degree_credit_total)', () => {
    const policyData: FlatPolicyData = {
      residency_credits: '30',
      max_transfer_credits: '90',
      max_alt_credit: 30,
      transfer_alt_bucket_mode: 'combined',
      degree_credit_total: 120,
    };
    const out = prePromotePolicyPack({
      policyData,
      fieldProvenance: baseProv(),
      totalScore: 80,
      hasGroundTruth: false,
    });
    expect(out.policyData.max_transfer_alt_combined_credits).toBe(120);
    expect(out.fieldProvenance.max_transfer_alt_combined_credits?.source).toBe('derived');
    expect(out.fieldProvenance.max_transfer_alt_combined_credits?.confidence).toBe(90);
    const basis = out.fieldProvenance.max_transfer_alt_combined_credits
      ?.derivation_basis as Record<string, unknown> | undefined;
    expect(basis?.type).toBe('combined_cap_sum');
    expect(basis?.transfer_component).toBe(90);
    expect(basis?.alt_component).toBe(30);
    expect(basis?.computed_value).toBe(120);
  });

  it('does not derive combined cap when bucket mode is separate', () => {
    const policyData: FlatPolicyData = {
      residency_credits: '30',
      max_transfer_credits: '90',
      max_alt_credit: 30,
      transfer_alt_bucket_mode: 'separate',
      degree_credit_total: 120,
    };
    const out = prePromotePolicyPack({
      policyData,
      fieldProvenance: baseProv(),
      totalScore: 80,
      hasGroundTruth: false,
    });
    expect(out.policyData.max_transfer_alt_combined_credits).toBeUndefined();
  });

  it('mirrors max_ace_nccrs_credits → max_alt_credit in separate mode', () => {
    const policyData: FlatPolicyData = {
      residency_credits: '30',
      max_transfer_credits: '90',
      max_ace_nccrs_credits: '30',
      transfer_alt_bucket_mode: 'separate',
      degree_credit_total: 120,
    };
    const fieldProvenance = baseProv();
    fieldProvenance['max_ace_nccrs_credits'] = {
      source: 'ai_extraction',
      confidence: 70,
      source_url: 'https://example.edu/ace',
    };
    const out = prePromotePolicyPack({
      policyData,
      fieldProvenance,
      totalScore: 80,
      hasGroundTruth: false,
    });
    expect(out.policyData.max_alt_credit).toBe(30);
    expect(out.fieldProvenance.max_alt_credit?.source).toBe('derived');
    expect(out.fieldProvenance.max_alt_credit?.confidence).toBe(70);
  });

  it('attaches provenance_verified_at to ai_extraction critical fields with a URL', () => {
    const out = prePromotePolicyPack({
      policyData: {
        residency_credits: '30',
        max_transfer_credits: '90',
        transfer_alt_bucket_mode: 'separate',
        degree_credit_total: 120,
      },
      fieldProvenance: baseProv(),
      totalScore: 85,
      hasGroundTruth: false,
    });
    expect(typeof out.fieldProvenance.residency_credits['provenance_verified_at']).toBe('string');
    expect(typeof out.fieldProvenance.max_transfer_credits['provenance_verified_at']).toBe('string');
  });

  it('never overwrites ground_truth provenance', () => {
    const fieldProvenance: FlatProvenance = {
      residency_credits: {
        source: 'ground_truth',
        confidence: 100,
        source_url: 'https://example.edu/gt',
        provenance_verified_at: '2024-01-01T00:00:00.000Z',
      },
    };
    const out = prePromotePolicyPack({
      policyData: { residency_credits: '30' },
      fieldProvenance,
      totalScore: 95,
      hasGroundTruth: true,
    });
    expect(out.fieldProvenance.residency_credits.source).toBe('ground_truth');
    expect(out.fieldProvenance.residency_credits['provenance_verified_at']).toBe(
      '2024-01-01T00:00:00.000Z',
    );
  });

  it('is idempotent — second run produces identical policyData/provenance', () => {
    const policyData: FlatPolicyData = {
      residency_credits: '30',
      max_transfer_credits: '90',
      max_alt_credit: 30,
      transfer_alt_bucket_mode: 'combined',
      degree_credit_total: 120,
    };
    const r1 = prePromotePolicyPack({
      policyData,
      fieldProvenance: baseProv(),
      totalScore: 85,
      hasGroundTruth: false,
    });
    const r2 = prePromotePolicyPack({
      policyData: r1.policyData,
      fieldProvenance: r1.fieldProvenance,
      totalScore: 85,
      hasGroundTruth: false,
    });
    expect(r2.policyData).toEqual(r1.policyData);
    // Confidence + verification stamps remain identical
    expect(r2.fieldProvenance.max_transfer_alt_combined_credits?.confidence).toBe(
      r1.fieldProvenance.max_transfer_alt_combined_credits?.confidence,
    );
  });

  it('records canonical provenance_url onto policy_data when supplied', () => {
    const out = prePromotePolicyPack({
      policyData: {
        residency_credits: '30',
        max_transfer_credits: '90',
        transfer_alt_bucket_mode: 'separate',
        degree_credit_total: 120,
      },
      fieldProvenance: baseProv(),
      totalScore: 80,
      hasGroundTruth: false,
      canonicalProvenanceUrl: 'https://example.edu/policy',
    });
    expect((out.policyData as Record<string, unknown>)['provenance_url']).toBe(
      'https://example.edu/policy',
    );
  });
});
