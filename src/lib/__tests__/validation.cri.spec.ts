import { describe, it, expect } from 'vitest';
import { validateApiResponse, CRIResponseSchema, RecommendationsResponseSchema } from '@/utils/validation';

describe('CRI Response Validation', () => {
  it('should validate correct CRI response', () => {
    const validCRIResponse = {
      success: true,
      userId: 'test-user-id',
      trackId: 'test-track-id',
      cri: 75,
      components: [
        {
          skillId: 'javascript',
          target: 80,
          current: 60,
          weight: 0.3
        }
      ],
      modelVersion: 'cri:v1',
      computedAt: '2024-01-01T00:00:00Z',
      cached: false,
      telemetry: {
        latency_ms: 150,
        db_reads: 5,
        db_writes: 2,
        strategy: 'computed'
      }
    };

    expect(() => validateApiResponse(CRIResponseSchema, validCRIResponse)).not.toThrow();
  });

  it('should reject invalid CRI score (out of range)', () => {
    const invalidCRIResponse = {
      success: true,
      userId: 'test-user-id', 
      trackId: 'test-track-id',
      cri: 150, // Invalid: > 100
      components: [],
      modelVersion: 'cri:v1',
      computedAt: '2024-01-01T00:00:00Z',
      cached: false,
      telemetry: {
        latency_ms: 150,
        db_reads: 5,
        db_writes: 2,
        strategy: 'computed'
      }
    };

    expect(() => validateApiResponse(CRIResponseSchema, invalidCRIResponse)).toThrow();
  });

  it('should reject missing required fields', () => {
    const incompleteCRIResponse = {
      success: true,
      // Missing userId, trackId, etc.
      cri: 75
    };

    expect(() => validateApiResponse(CRIResponseSchema, incompleteCRIResponse)).toThrow();
  });
});

describe('Recommendations Response Validation', () => {
  it('should validate correct recommendations response', () => {
    const validRecommendationsResponse = {
      success: true,
      userId: 'test-user-id',
      trackId: 'test-track-id',
      recommendations: [
        {
          course: {
            id: 'course-1',
            platform: {
              id: 'platform-1',
              slug: 'coursera',
              name: 'Coursera'
            },
            instructor: {
              id: 'instructor-1',
              name: 'John Doe',
              org: 'Stanford',
              reputation: 4.8
            },
            title: 'JavaScript Fundamentals',
            slug: 'javascript-fundamentals',
            url: 'https://coursera.org/course/javascript',
            difficulty: 2,
            durationHours: 20
          },
          reason: 'Fills JavaScript skill gap',
          score: 0.85,
          expectedCRIChange: 12,
          covers: [
            {
              skillId: 'javascript',
              from: 20,
              to: 60,
              weight: 0.8
            }
          ]
        }
      ],
      metrics: {
        candidateCount: 50,
        selected: 5,
        criBefore: 45,
        criAfterEstimate: 62
      },
      modelVersion: 'reco:v1',
      telemetry: {
        latency_ms: 200,
        db_reads: 8,
        db_writes: 1,
        strategy: 'gap_fill'
      }
    };

    expect(() => validateApiResponse(RecommendationsResponseSchema, validRecommendationsResponse)).not.toThrow();
  });

  it('should reject invalid difficulty level', () => {
    const invalidResponse = {
      success: true,
      userId: 'test-user-id',
      trackId: 'test-track-id',
      recommendations: [
        {
          course: {
            id: 'course-1',
            platform: { id: 'platform-1', slug: 'coursera', name: 'Coursera' },
            instructor: null,
            title: 'Test Course',
            slug: 'test-course',
            url: 'https://coursera.org/test',
            difficulty: 6, // Invalid: > 5
            durationHours: 10
          },
          reason: 'Test reason',
          score: 0.5,
          expectedCRIChange: 5,
          covers: []
        }
      ],
      metrics: { candidateCount: 1, selected: 1, criBefore: 50, criAfterEstimate: 55 },
      modelVersion: 'reco:v1',
      telemetry: { latency_ms: 100, db_reads: 1, db_writes: 0, strategy: 'gap_fill' }
    };

    expect(() => validateApiResponse(RecommendationsResponseSchema, invalidResponse)).toThrow();
  });
});