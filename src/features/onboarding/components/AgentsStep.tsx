/**
 * AgentsStep — Shows discovered agents after gateway connection.
 */
import { Bot, Users, WifiOff } from "lucide-react";

export type AgentsStepProps = {
  agentCount: number;
  connected: boolean;
};

export const AgentsStep = ({ agentCount, connected }: AgentsStepProps) => {
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <WifiOff className="h-8 w-8 text-white/30" />
        <p className="text-sm text-white/60">
          에이전트를 찾으려면 먼저 게이트웨이에 연결하세요.
        </p>
      </div>
    );
  }

  if (agentCount === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <Bot className="h-6 w-6 text-white/40" />
          </div>
          <p className="text-sm font-medium text-white">에이전트가 없습니다</p>
          <p className="max-w-xs text-center text-xs text-white/55">
            게이트웨이는 연결되었지만 아직 설정된 에이전트가 없습니다.
            안내를 마친 뒤 에이전트 사이드바에서 에이전트를 만들 수
            있습니다.
          </p>
        </div>

        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
          <p className="text-xs font-medium text-white/80">빠른 시작:</p>
          <ol className="mt-2 space-y-1.5 text-[11px] text-white/55">
            <li>1. 에이전트 사이드바의 + 버튼을 누릅니다</li>
            <li>2. 에이전트 이름과 모델을 고릅니다</li>
            <li>3. 스킬과 성격을 설정합니다</li>
            <li>4. 에이전트가 자기 책상에 나타나는 것을 확인합니다!</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
        <Users className="h-5 w-5 text-amber-300" />
        <div>
          <p className="text-sm font-semibold text-white">
            에이전트 {agentCount}명을 찾았습니다
          </p>
          <p className="text-[11px] text-white/55">
            AI 팀이 오피스에서 준비를 마치고 기다리고 있습니다.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-white/70">
          에이전트와 할 수 있는 일:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "대화", desc: "메시지를 보내고 답변을 받습니다" },
            { label: "승인", desc: "실행 명령을 검토하고 승인합니다" },
            { label: "설정", desc: "brain 파일과 설정을 수정합니다" },
            { label: "모니터링", desc: "런타임 활동을 실시간으로 봅니다" },
          ].map(({ label, desc }) => (
            <div
              key={label}
              className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <p className="text-[11px] font-semibold text-white">{label}</p>
              <p className="text-[10px] text-white/45">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
