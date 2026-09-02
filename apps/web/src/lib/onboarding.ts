export const ONBOARDING_STEP_IDS = ["identity", "directory", "campaign", "template"] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export type OnboardingFacts = {
  hasLogo: boolean;
  hasPersonWithTitle: boolean;
  hasCampaign: boolean;
  hasTemplate: boolean;
  skipCampaign: boolean;
};

const REQUIRED: Record<OnboardingStepId, boolean> = {
  identity: true,
  directory: true,
  campaign: false,
  template: true,
};

export function isPersonTitleComplete(jobTitle: string | null | undefined): boolean {
  return Boolean(jobTitle?.trim());
}

export function onboardingState(facts: OnboardingFacts) {
  const done: Record<OnboardingStepId, boolean> = {
    identity: facts.hasLogo,
    directory: facts.hasPersonWithTitle,
    campaign: facts.hasCampaign,
    template: facts.hasTemplate,
  };

  const steps = ONBOARDING_STEP_IDS.map((id) => ({
    id,
    done: done[id],
    required: REQUIRED[id],
    visible: id === "campaign" ? !facts.skipCampaign : true,
  }));

  const visible = steps.filter((step) => step.visible);
  const requiredComplete = steps.filter((step) => step.required).every((step) => step.done);

  return {
    steps,
    showChecklist: !requiredComplete,
    completedCount: visible.filter((step) => step.done).length,
    totalCount: visible.length,
    completedVisible: visible.filter((step) => step.done).map((step) => step.id),
    incompleteVisible: visible.filter((step) => !step.done).map((step) => step.id),
  };
}
