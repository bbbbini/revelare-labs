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
    description: "3D로 보는 AI 오피스",
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
    title: "게이트웨이 연결",
    description: "런타임 인스턴스에 연결합니다",
    skippable: false,
  },
  {
    id: "agents",
    title: "에이전트",
    description: "AI 팀을 만나 보세요",
    skippable: true,
  },
  {
    id: "company",
    title: "회사 구성",
    description: "조직 구조를 생성합니다",
    skippable: true,
  },
  {
    id: "complete",
    title: "준비 완료",
    description: "둘러보기를 시작하세요",
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
