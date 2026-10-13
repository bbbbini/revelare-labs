export const AGENT_FILE_NAMES = [
  "AGENTS.md",
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "TOOLS.md",
  "HEARTBEAT.md",
  "MEMORY.md",
] as const;

export type AgentFileName = (typeof AGENT_FILE_NAMES)[number];

export const PERSONALITY_FILE_NAMES = [
  "SOUL.md",
  "AGENTS.md",
  "USER.md",
  "IDENTITY.md",
] as const satisfies readonly AgentFileName[];

export type PersonalityFileName = (typeof PERSONALITY_FILE_NAMES)[number];

export const PERSONALITY_FILE_LABELS: Record<PersonalityFileName, string> = {
  "SOUL.md": "Persona",
  "AGENTS.md": "Directives",
  "USER.md": "Context",
  "IDENTITY.md": "Identity",
};

export const isAgentFileName = (value: string): value is AgentFileName =>
  AGENT_FILE_NAMES.includes(value as AgentFileName);

export const AGENT_FILE_META: Record<AgentFileName, { title: string; hint: string }> = {
  "AGENTS.md": {
    title: "AGENTS.md",
    hint: "작업 지침, 우선순위, 규칙.",
  },
  "SOUL.md": {
    title: "SOUL.md",
    hint: "페르소나, 말투, 한계.",
  },
  "IDENTITY.md": {
    title: "IDENTITY.md",
    hint: "이름, 분위기, 이모지.",
  },
  "USER.md": {
    title: "USER.md",
    hint: "사용자 정보와 선호.",
  },
  "TOOLS.md": {
    title: "TOOLS.md",
    hint: "로컬 도구 메모와 규칙.",
  },
  "HEARTBEAT.md": {
    title: "HEARTBEAT.md",
    hint: "주기 실행용 짧은 체크리스트.",
  },
  "MEMORY.md": {
    title: "MEMORY.md",
    hint: "이 에이전트가 오래 기억할 내용.",
  },
};

export const AGENT_FILE_PLACEHOLDERS: Record<AgentFileName, string> = {
  "AGENTS.md": "이 에이전트는 어떻게 일해야 하나요? 우선순위, 규칙, 습관.",
  "SOUL.md": "말투, 성격, 한계, 말하는 방식.",
  "IDENTITY.md": "이름, 분위기, 이모지, 한 줄 소개.",
  "USER.md": "사용자를 어떻게 부를까요? 선호와 맥락.",
  "TOOLS.md": "로컬 도구 메모, 규칙, 단축 방법.",
  "HEARTBEAT.md": "주기 실행용 짧은 체크리스트.",
  "MEMORY.md": "기억해 둘 사실, 결정, 선호.",
};

export const createAgentFilesState = () =>
  Object.fromEntries(
    AGENT_FILE_NAMES.map((name) => [name, { content: "", exists: false, path: null, workspace: null }])
  ) as Record<AgentFileName, { content: string; exists: boolean; path: string | null; workspace: string | null }>;
