import { describe, expect, it } from "vitest";
import { isPersonTitleComplete, onboardingState } from "./onboarding";

const empty = {
  hasLogo: false,
  hasPersonWithTitle: false,
  hasCampaign: false,
  hasTemplate: false,
  skipCampaign: false,
};

describe("isPersonTitleComplete", () => {
  it("requires a non-empty job title", () => {
    expect(isPersonTitleComplete(null)).toBe(false);
    expect(isPersonTitleComplete("")).toBe(false);
    expect(isPersonTitleComplete("   ")).toBe(false);
    expect(isPersonTitleComplete("Satış Müdürü")).toBe(true);
  });
});

describe("onboardingState", () => {
  it("shows all four steps for a new org", () => {
    const state = onboardingState(empty);
    expect(state.showChecklist).toBe(true);
    expect(state.incompleteVisible).toEqual(["identity", "directory", "campaign", "template"]);
    expect(state.completedCount).toBe(0);
    expect(state.totalCount).toBe(4);
  });

  it("marks completed required steps and keeps incomplete cards", () => {
    const state = onboardingState({ ...empty, hasLogo: true, hasPersonWithTitle: true });
    expect(state.completedVisible).toEqual(["identity", "directory"]);
    expect(state.incompleteVisible).toEqual(["campaign", "template"]);
    expect(state.completedCount).toBe(2);
    expect(state.totalCount).toBe(4);
    expect(state.showChecklist).toBe(true);
  });

  it("hides the campaign step permanently after skip", () => {
    const state = onboardingState({ ...empty, hasLogo: true, skipCampaign: true });
    expect(state.incompleteVisible).toEqual(["directory", "template"]);
    expect(state.totalCount).toBe(3);
    expect(state.completedCount).toBe(1);
    expect(state.steps.find((step) => step.id === "campaign")?.visible).toBe(false);
  });

  it("does not count a person without a job title", () => {
    const state = onboardingState({ ...empty, hasLogo: true, hasPersonWithTitle: false });
    expect(state.incompleteVisible).toContain("directory");
  });

  it("hides the checklist once every required step is done, even without a campaign", () => {
    const state = onboardingState({
      hasLogo: true,
      hasPersonWithTitle: true,
      hasCampaign: false,
      hasTemplate: true,
      skipCampaign: false,
    });
    expect(state.showChecklist).toBe(false);
  });

  it("hides the checklist when required steps are done after skipping campaign", () => {
    const state = onboardingState({
      hasLogo: true,
      hasPersonWithTitle: true,
      hasCampaign: false,
      hasTemplate: true,
      skipCampaign: true,
    });
    expect(state.showChecklist).toBe(false);
  });

  it("keeps the checklist if only the optional campaign is missing among four visible steps but a required step is also missing", () => {
    const state = onboardingState({
      hasLogo: true,
      hasPersonWithTitle: true,
      hasCampaign: false,
      hasTemplate: false,
      skipCampaign: false,
    });
    expect(state.showChecklist).toBe(true);
    expect(state.incompleteVisible).toEqual(["campaign", "template"]);
  });
});
