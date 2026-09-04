/**
 * Physics module: Live Cm–Alpha Relationship and Trim
 * 
 * Internal calculations use SI units (radians). Degree inputs are converted where necessary.
 * Sign convention: Positive implies nose-up for both pitching moment and angle of attack.
 * Assumptions: Linear relationship over the range, quasi-static model, small disturbance.
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Calculates the pitching-moment coefficient at a selected angle of attack.
 */
export function calculatePitchingMoment(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  const alphaRad = angleOfAttackDeg * DEG_TO_RAD;
  return cm0 + (cmAlphaPerRad * alphaRad);
}

/**
 * Calculates the trim angle of attack.
 * Returns "not available" if the slope is zero to prevent division by zero.
 */
export function calculateTrimAngleDeg(cm0, cmAlphaPerRad) {
  if (Math.abs(cmAlphaPerRad) === 0) {
    return "not available";
  }
  const alphaTrimRad = -cm0 / cmAlphaPerRad;
  return alphaTrimRad * RAD_TO_DEG;
}

/**
 * Calculates the disturbance moment-coefficient change (delta_Cm).
 */
export function calculateDisturbanceMomentChange(cmAlphaPerRad, disturbanceAlphaDeg) {
  const deltaAlphaRad = disturbanceAlphaDeg * DEG_TO_RAD;
  return cmAlphaPerRad * deltaAlphaRad;
}

/**
 * Determines whether the condition is trimmed based on the provided tolerance.
 */
export function checkIsTrimmed(cm) {
  return Math.abs(cm) <= 1e-6;
}

/**
 * Classifies the disturbance tendency based on the sign of delta_alpha_rad * delta_Cm.
 */
export function classifyTendency(disturbanceAlphaDeg, deltaCm) {
  const deltaAlphaRad = disturbanceAlphaDeg * DEG_TO_RAD;
  const metric = deltaAlphaRad * deltaCm;

  // Use a tiny epsilon for floating-point comparisons around zero
  if (metric < -1e-12) {
    return "restoring";
  } else if (metric > 1e-12) {
    return "destabilizing";
  } else {
    return "neutral";
  }
}