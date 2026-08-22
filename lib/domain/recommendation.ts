export const RECOMMENDATIONS = [
  "STRONG BUY",
  "BUY",
  "MARGINAL",
  "SKIP",
] as const;

export type Recommendation = (typeof RECOMMENDATIONS)[number];

export interface RecommendationMetrics {
  profitCents: number;
  roiPercent: number;
}

export interface RecommendationThreshold {
  minProfitCents: number;
  minRoiPercent: number;
}

export interface RecommendationThresholds {
  strongBuy: RecommendationThreshold;
  buy: RecommendationThreshold;
  marginal: RecommendationThreshold;
}

export type RecommendationThresholdOverrides = {
  [Band in keyof RecommendationThresholds]?: Partial<
    RecommendationThresholds[Band]
  >;
};

/**
 * Both the dollar-profit and ROI floors must be met. This intentionally keeps
 * tiny-dollar flips with a superficially high ROI out of the buy tiers.
 */
export const DEFAULT_RECOMMENDATION_THRESHOLDS: Readonly<RecommendationThresholds> =
  Object.freeze({
    strongBuy: Object.freeze({ minProfitCents: 2_500, minRoiPercent: 40 }),
    buy: Object.freeze({ minProfitCents: 1_000, minRoiPercent: 20 }),
    marginal: Object.freeze({ minProfitCents: 300, minRoiPercent: 8 }),
  });

export class RecommendationValidationError extends RangeError {
  override readonly name = "RecommendationValidationError";
}

function mergeThresholds(
  overrides: RecommendationThresholdOverrides,
): RecommendationThresholds {
  return {
    strongBuy: {
      ...DEFAULT_RECOMMENDATION_THRESHOLDS.strongBuy,
      ...overrides.strongBuy,
    },
    buy: {
      ...DEFAULT_RECOMMENDATION_THRESHOLDS.buy,
      ...overrides.buy,
    },
    marginal: {
      ...DEFAULT_RECOMMENDATION_THRESHOLDS.marginal,
      ...overrides.marginal,
    },
  };
}

function validateThresholds(thresholds: RecommendationThresholds): void {
  for (const [band, threshold] of Object.entries(thresholds)) {
    if (
      !Number.isSafeInteger(threshold.minProfitCents) ||
      threshold.minProfitCents < 0
    ) {
      throw new RecommendationValidationError(
        `${band}.minProfitCents must be a non-negative safe integer`,
      );
    }
    if (
      !Number.isFinite(threshold.minRoiPercent) ||
      threshold.minRoiPercent < 0
    ) {
      throw new RecommendationValidationError(
        `${band}.minRoiPercent must be a non-negative finite number`,
      );
    }
  }

  const orderedBands = [
    thresholds.strongBuy,
    thresholds.buy,
    thresholds.marginal,
  ];
  for (let index = 0; index < orderedBands.length - 1; index += 1) {
    const higher = orderedBands[index];
    const lower = orderedBands[index + 1];
    if (
      higher.minProfitCents < lower.minProfitCents ||
      higher.minRoiPercent < lower.minRoiPercent
    ) {
      throw new RecommendationValidationError(
        "Recommendation thresholds must descend from strong buy to marginal",
      );
    }
  }
}

function meetsThreshold(
  metrics: RecommendationMetrics,
  threshold: RecommendationThreshold,
): boolean {
  return (
    metrics.profitCents >= threshold.minProfitCents &&
    metrics.roiPercent >= threshold.minRoiPercent
  );
}

export function getRecommendation(
  metrics: RecommendationMetrics,
  overrides: RecommendationThresholdOverrides = {},
): Recommendation {
  if (!Number.isSafeInteger(metrics.profitCents)) {
    throw new RecommendationValidationError(
      "profitCents must be a safe integer number of cents",
    );
  }
  if (!Number.isFinite(metrics.roiPercent)) {
    throw new RecommendationValidationError("roiPercent must be finite");
  }

  const thresholds = mergeThresholds(overrides);
  validateThresholds(thresholds);

  if (meetsThreshold(metrics, thresholds.strongBuy)) return "STRONG BUY";
  if (meetsThreshold(metrics, thresholds.buy)) return "BUY";
  if (meetsThreshold(metrics, thresholds.marginal)) return "MARGINAL";
  return "SKIP";
}

/** Higher values sort better. */
export const RECOMMENDATION_RANK: Readonly<Record<Recommendation, number>> =
  Object.freeze({
    "STRONG BUY": 3,
    BUY: 2,
    MARGINAL: 1,
    SKIP: 0,
  });
