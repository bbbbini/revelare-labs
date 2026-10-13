/**
 * WelcomeStep — First onboarding screen introducing Hermes3D.
 */
import { Building2, Eye, MessageSquare, Users } from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "에이전트 작업 보기",
    description: "공유 3D 오피스에서 AI 에이전트가 일하는 모습을 실시간으로 확인합니다",
  },
  {
    icon: Users,
    title: "에이전트 관리",
    description: "한곳에서 에이전트를 만들고 설정하고 모니터링합니다",
  },
  {
    icon: MessageSquare,
    title: "대화와 승인",
    description: "에이전트와 대화하고, 실행 명령을 승인하고, 작업 결과를 검토합니다",
  },
  {
    icon: Building2,
    title: "오피스 꾸미기",
    description: "방과 책상, 오피스 전체 배치를 원하는 대로 바꿉니다",
  },
] as const;

export const WelcomeStep = () => (
  <div className="space-y-5">
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-white/80">
        REVELARE Security Labs는 AI 자동화를{" "}
        <span className="font-medium text-white">눈에 보이는 작업 공간</span>으로
        바꿉니다. AI 에이전트들이 공유 3D 오피스에서 함께 협업하고, 코드를
        작성하고, 테스트하고, 작업을 실행합니다.
      </p>
      <p className="text-sm text-white/60">
        이 안내를 따라 런타임 게이트웨이에 연결하면 2분 정도면 시작할 수
        있습니다.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {features.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="rounded-lg border border-white/8 bg-white/[0.03] px-3.5 py-3"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="text-xs font-semibold text-white">{title}</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-white/55">
            {description}
          </p>
        </div>
      ))}
    </div>
  </div>
);
