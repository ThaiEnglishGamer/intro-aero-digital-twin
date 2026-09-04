import {
  calculatePitchingMoment,
  calculateTrimAngleDeg,
  calculateDisturbanceMomentChange,
  checkIsTrimmed,
  classifyTendency
} from '../physics/trim-response.js';

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description: "Determines whether the pitching-moment model is trimmed and evaluates its restoring tendency.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: ["cm0", "cmAlphaPerRad", "angleOfAttackDeg", "disturbanceAlphaDeg"],
  requiresCapabilities: [{ id: "loads.pitch.component-sum", version: 1 }],
  providesCapabilities: [{ id: "stability.pitch.cm-alpha", version: 1 }],
  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive implies nose-up for both pitching moment and angle of attack."
  ],
  validityLimits: [
    "Do not use this linear relationship at stall, at large angles of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "This model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency in this model is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle."
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {}
  },

  analyze(aircraft, capabilityContext) {
    const { cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg } = aircraft;

    // Calculate core physics
    const cm = calculatePitchingMoment(cm0, cmAlphaPerRad, angleOfAttackDeg);
    const trimAngle = calculateTrimAngleDeg(cm0, cmAlphaPerRad);
    const deltaCm = calculateDisturbanceMomentChange(cmAlphaPerRad, disturbanceAlphaDeg);
    const isTrimmed = checkIsTrimmed(cm);
    const tendency = classifyTendency(disturbanceAlphaDeg, deltaCm);

    // Section 9.1 Numerical Case implementation
    const v1_cm = calculatePitchingMoment(0.04, -0.8, 2.86);
    const v1_trim = calculateTrimAngleDeg(0.04, -0.8);
    const v1_delta = calculateDisturbanceMomentChange(-0.8, 2.0);
    const v1_tend = classifyTendency(2.0, v1_delta);
    const case1Passed = 
      Math.abs(v1_cm - 0.0000669) < 1e-5 && 
      Math.abs(v1_trim - 2.8647890) < 1e-5 && 
      Math.abs(v1_delta - (-0.0279253)) < 1e-5 && 
      !checkIsTrimmed(v1_cm) &&
      v1_tend === "restoring";

    // Section 9.2 Behavioral Case implementation
    const v2_delta = calculateDisturbanceMomentChange(0.8, 2.0);
    const v2_tend = classifyTendency(2.0, v2_delta);
    const case2Passed = v2_delta > 0 && v2_tend === "destabilizing";

    // Section 9.3 Boundary Case implementation
    const v3_trim = calculateTrimAngleDeg(0.04, 0.0);
    const v3_delta = calculateDisturbanceMomentChange(0.0, 2.0);
    const v3_tend = classifyTendency(2.0, v3_delta);
    const case3Passed = v3_trim === "not available" && v3_tend === "neutral";

    // Plot points calculation (-10 deg through +10 deg)
    const points = [];
    for (let alphaPlot = -10; alphaPlot <= 10; alphaPlot++) {
      points.push({
        x: alphaPlot,
        y: calculatePitchingMoment(cm0, cmAlphaPerRad, alphaPlot)
      });
    }

    // Determine status & text
    let status = "caution";
    if (tendency === "restoring") status = "pass";
    if (tendency === "neutral") status = "neutral";
    
    const interpretationText = isTrimmed
      ? `The aircraft is trimmed at ${angleOfAttackDeg.toFixed(2)} degrees. It exhibits a ${tendency} pitching moment tendency.`
      : `The aircraft is not trimmed at the selected angle of attack. It exhibits a ${tendency} pitching moment tendency.`;

    return {
      results: [
        { name: "Pitching-moment coefficient", value: cm, unit: "", precision: 6, emphasis: true },
        { name: "Trim angle", value: trimAngle, unit: trimAngle === "not available" ? "" : "deg", precision: 4 },
        { name: "Disturbance moment-coefficient change", value: deltaCm, unit: "", precision: 6 },
        { name: "Is trimmed?", value: isTrimmed ? "Yes" : "No", unit: "", precision: 0 },
        { name: "Disturbance tendency", value: tendency, unit: "", precision: 0 }
      ],
      verificationCases: [
        { name: "9.1 Numerical calculation matches Sect 8 reference", passed: case1Passed },
        { name: "9.2 Positive slope creates destabilizing tendency", passed: case2Passed },
        { name: "9.3 Zero slope produces neutral tendency and handles trim gracefully", passed: case3Passed }
      ],
      decision: {
        question: "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation: interpretationText,
        status: status
      },
      plots: [
        {
          title: "Pitching Moment vs. Angle of Attack",
          xLabel: "Angle of Attack",
          yLabel: "Cm",
          xUnit: "deg",
          yUnit: "",
          series: [{ name: "Cm(alpha)", points }],
          regions: [],
          referenceLines: [{ axis: "y", value: 0, label: "Trim line (Cm = 0)" }]
        }
      ],
      scene: null
    };
  }
};

export const model = {
  kind: "derived",
  evaluate(runtimeContext) {
    const { cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg } = runtimeContext.aircraft;
    
    // Evaluate physics purely for capability propagation
    const cm = calculatePitchingMoment(cm0, cmAlphaPerRad, angleOfAttackDeg);
    const trimAngleDeg = calculateTrimAngleDeg(cm0, cmAlphaPerRad);
    const deltaCm = calculateDisturbanceMomentChange(cmAlphaPerRad, disturbanceAlphaDeg);
    const isTrimmed = checkIsTrimmed(cm);
    const tendency = classifyTendency(disturbanceAlphaDeg, deltaCm);

    return {
      values: {
        cm,
        trimAngleDeg,
        deltaCm,
        isTrimmed,
        tendency
      }
    };
  }
};