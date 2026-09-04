import { describe, expect, it } from "vitest";
import { evaluateMissionLoading } from "../../src/student/physics/mission-loading.js";
import { feature as missionLoadingFeature } from "../../src/student/features/mission-loading.feature.js";
import { createCapabilityRegistry, modelsForFeature } from "../../src/core/capabilities/capabilityContract.js";
import { buildCurriculum } from "../../src/core/data/curriculum.js";
import { initialAircraft } from "../../src/core/data/aircraft.js";
import { featureEntries } from "../../src/core/features/index.js";
import { resolveFeatureAnalysis } from "../../src/core/features/featureContract.js";
import { capabilityContext, runSimulation } from "../../src/core/simulation/runtime.js";

const a = { massKg: 1.35, airframeCgM: .11, payloadKg: .25, initialPayloadPositionM: .1, missionPayloadPositionM: .24, neutralPointM: .16, meanChordM: .32, forwardCgLimitM: .09, aftCgLimitM: .16, minimumStaticMargin: .05 };

describe("mission loading", () => {
  it("moves CG aft and reduces margin when payload moves aft", () => { const r = evaluateMissionLoading(a); expect(r.cgShiftM).toBeGreaterThan(0); expect(r.missionStaticMargin).toBeLessThan(r.initialStaticMargin); });
  it("has zero shift when stations coincide and rejects reversed limits", () => { expect(evaluateMissionLoading({ ...a, missionPayloadPositionM: a.initialPayloadPositionM }).cgShiftM).toBe(0); expect(() => evaluateMissionLoading({ ...a, forwardCgLimitM: .2, aftCgLimitM: .1 })).toThrow(); });
  it("states a failed loading requirement in direct grammatical language", () => {
    const analysis = missionLoadingFeature.analyze(
      { ...a, missionPayloadPositionM: 0.5 },
      { "stability.pitch.cm-alpha": {} },
    );
    expect(analysis.decision.status).toBe("caution");
    expect(analysis.decision.interpretation).toContain("At least one modeled loading state does not satisfy");
    expect(analysis.decision.interpretation).not.toContain("Not both modeled loading states satisfy");
  });
});

const downstreamIds = ["static-margin", "tail-elevator-contribution", "stick-free-effect", "cg-loading", "lateral-static-stability", "pitch-dynamic-response", "longitudinal-modes", "dynamic-mode", "stability-trade-study", "mission-loading"];

const stage4Fixture = {
  feature: {
    contractVersion: 4, id: "trim-response", title: "Stage 4 activation fixture", learningMode: "concept", topicId: "stability",
    requiresCapabilities: [{ id: "loads.pitch.component-sum", version: 1 }], providesCapabilities: [{ id: "stability.pitch.cm-alpha", version: 1 }],
    analyze: () => ({ results: [{ label: "Fixture", value: 0, unit: "" }], verificationCases: [{ label: "Fixture", passed: true }], decision: { question: "Fixture", interpretation: "Fixture", status: "neutral" } }),
  },
  model: { kind: "derived", evaluate: () => ({ values: { cmAlphaPerRad: -0.8 } }) },
};

describe("Stage 4 activation boundary", () => {
  // We filter out your real Stage 4 file so the test can pretend it's missing temporarily
  const testEntries = featureEntries.filter(({ feature }) => feature.id !== "trim-response");

  it("keeps every downstream stage runtime-locked while Stage 4 is absent", () => {
    expect(testEntries.some(({ feature }) => feature.id === "trim-response")).toBe(false);
    const registry = createCapabilityRegistry(testEntries);
    const stability = buildCurriculum(testEntries, registry).find(({ id }) => id === "stability");
    
    expect(stability.modules.filter(({ feature }) => downstreamIds.includes(feature.id)).every(({ runtimeReady }) => !runtimeReady)).toBe(true);
  });

  it("activates and evaluates every downstream stage when the Stage 4 capability is installed", () => {
    const entries = [...testEntries, stage4Fixture];
    const registry = createCapabilityRegistry(entries);
    expect(registry.issues).toEqual([]);
    
    const stability = buildCurriculum(entries, registry).find(({ id }) => id === "stability");
    expect(stability.modules.filter(({ feature }) => downstreamIds.includes(feature.id)).every(({ runtimeReady }) => runtimeReady)).toBe(true);
    
    downstreamIds.forEach((id) => {
      const models = modelsForFeature(id, registry);
      const context = capabilityContext(models, initialAircraft);
      const entry = entries.find(({ feature }) => feature.id === id);
      const analysis = resolveFeatureAnalysis(entry.feature, initialAircraft, context);
      expect(analysis.results[0].label).not.toBe("Analysis unavailable");
      expect(analysis.verificationCases.every(({ passed }) => passed)).toBe(true);
    });
    
    const pitchEntries = modelsForFeature("pitch-dynamic-response", registry);
    const pitchRun = runSimulation({ entries: pitchEntries, aircraft: initialAircraft, scenario: { durationS: 0.4, initialState: { pitchRad: 0, pitchRateRadS: 0 } } });
    expect(pitchRun.status).toBe("complete");
    expect(Object.values(pitchRun.state).every(Number.isFinite)).toBe(true);
  });
});