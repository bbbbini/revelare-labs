/**
 * Onboarding wizard types.
 *
 * The wizard is step-based and extensible: new steps can be added by
 * extending `OnboardingStepId` and registering a component in the
 * step registry.
 */

export type OnboardingStepId =
  | "welcome"
  | "prerequisites"
  | "connect"
  | "agents"
  | "company"
  | "complete";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
  /** Whether the step can be skipped. */
  skippable: boolean;
};

export type OnboardingState = {
  currentStep: OnboardingStepId;
  completedSteps: Set<OnboardingStepId>;
  /** Whether the user has dismissed the wizard entirely. */
  dismissed: boolean;
  /** Gateway connection state passed from the parent. */
  gatewayConnected: boolean;
  /** Number of agents discovered after connection. */
  agentCount: number;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "REVELARE Security Labs에 오신 것을 환영합니다",
    description: "연구원과 작업을 이어가는 공간",
    skippable: false,
  },
  {
    id: "prerequisites",
    title: "시작하기 전에",
    description: "준비할 것",
    skippable: true,
  },
  {
    id: "connect",
    title: "연구실 연결",
    description: "런타임 인스턴스에 연결합니다",
    skippable: false,
  },
  {
    id: "agents",
    title: "연구원 확인",
    description: "연결된 연구원을 확인합니다",
    skippable: true,
  },
  {
    id: "company",
    title: "연구팀 구성 (선택)",
    description: "필요한 경우 연구팀을 구성합니다",
    skippable: true,
  },
  {
    id: "complete",
    title: "준비 완료",
    description: "연구 작업을 시작하세요",
    skippable: false,
  },
];

export const getStepIndex = (stepId: OnboardingStepId): number =>
  ONBOARDING_STEPS.findIndex((s) => s.id === stepId);

export const getNextStep = (
  currentId: OnboardingStepId,
): OnboardingStepId | null => {
  const idx = getStepIndex(currentId);
  if (idx < 0 || idx >= ONBOARDING_STEPS.length - 1) return null;
  return ONBOARDING_STEPS[idx + 1].id;
};

export const getPrevStep = (
  currentId: OnboardingStepId,
): OnboardingStepId | null => {
  const idx = getStepIndex(currentId);
  if (idx <= 0) return null;
  return ONBOARDING_STEPS[idx - 1].id;
};
