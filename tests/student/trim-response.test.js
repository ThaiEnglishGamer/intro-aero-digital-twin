import { describe, it, expect } from 'vitest';
import {
  calculatePitchingMoment,
  calculateTrimAngleDeg,
  calculateDisturbanceMomentChange,
  checkIsTrimmed,
  classifyTendency
} from '../../src/student/physics/trim-response.js';

describe('Trim Response Physics Model', () => {
  it('evaluates the 9.1 numerical reference case correctly', () => {
    // Inputs from Section 8
    const cm0 = 0.04;
    const cmAlpha = -0.8;
    const alpha = 2.86;
    const deltaAlpha = 2.0;

    const cm = calculatePitchingMoment(cm0, cmAlpha, alpha);
    const trimAngle = calculateTrimAngleDeg(cm0, cmAlpha);
    const deltaCm = calculateDisturbanceMomentChange(cmAlpha, deltaAlpha);
    const isTrimmed = checkIsTrimmed(cm);
    const tendency = classifyTendency(deltaAlpha, deltaCm);

    // Validate using 5 decimal places of tolerance
    expect(cm).toBeCloseTo(0.000067, 5);
    expect(isTrimmed).toBe(false); // abs(0.000067) > 1e-6
    expect(trimAngle).toBeCloseTo(2.864789, 5);
    expect(deltaCm).toBeCloseTo(-0.027925, 5);
    expect(tendency).toBe('restoring');
  });

  it('evaluates the 9.2 behavioral case correctly', () => {
    // Changing cmAlpha from -0.8 to +0.8
    const cmAlpha = 0.8;
    const deltaAlpha = 2.0;

    const deltaCm = calculateDisturbanceMomentChange(cmAlpha, deltaAlpha);
    const tendency = classifyTendency(deltaAlpha, deltaCm);

    expect(deltaCm).toBeGreaterThan(0);
    expect(tendency).toBe('destabilizing');
  });

  it('evaluates the 9.3 boundary case correctly', () => {
    // Zero pitching-moment coefficient slope
    const cm0 = 0.04;
    const cmAlpha = 0.0;
    const deltaAlpha = 2.0;

    const trimAngle = calculateTrimAngleDeg(cm0, cmAlpha);
    const deltaCm = calculateDisturbanceMomentChange(cmAlpha, deltaAlpha);
    const tendency = classifyTendency(deltaAlpha, deltaCm);

    // Must return string error instead of NaN / Infinity
    expect(trimAngle).toBe('not available');
    expect(deltaCm).toBeCloseTo(0, 5);
    expect(tendency).toBe('neutral');
  });
});