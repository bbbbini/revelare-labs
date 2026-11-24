/**
 * WelcomeStep — First onboarding screen introducing Hermes3D.
 */
import { Building2, Eye, MessageSquare, Users } from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "연구원 작업 보기",
    description: "연구실에서 AI 연구원가 일하는 모습을 실시간으로 확인합니다",
  },
  {
    icon: Users,
    title: "연구원 관리",
    description: "한곳에서 연구원를 만들고 설정하고 모니터링합니다",
  },
  {
    icon: MessageSquare,
    title: "대화와 승인",
    description: "연구원와 대화하고, 실행 명령을 승인하고, 작업 결과를 검토합니다",
  },
  {
    icon: Building2,
    title: "작업과 결과 확인",
    description: "작업을 요청하고 진행 상태와 응답을 한곳에서 확인합니다",
  },
] as const;

export const WelcomeStep = () => (
  <div className="space-y-5">
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-foreground">
        REVELARE Security Labs는 AI 자동화를{" "}
        <span className="font-medium text-foreground">눈에 보이는 작업 공간</span>으로
        바꿉니다. AI 연구원들이 연구실에서 함께 협업하고, 코드를
        작성하고, 테스트하고, 작업을 실행합니다.
      </p>
      <p className="text-sm text-muted-foreground">
        이 안내를 따라 런타임 게이트웨이에 연결하면 준비된 연구원과 작업을 시작할 수
        있습니다.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {features.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="rounded-lg border border-border bg-surface-2 px-3.5 py-3"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-amber-700" />
            <span className="text-xs font-semibold text-foreground">{title}</span>
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
            {description}
          </p>
        </div>
      ))}
    </div>
  </div>
);
