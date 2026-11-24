import { Building2, Sparkles, Users, Wand2 } from "lucide-react";

export type CompanyStepProps = {
  connected: boolean;
  agentCount: number;
  onOpenCompanyBuilder: () => void;
};

export const CompanyStep = ({
  connected,
  agentCount,
  onOpenCompanyBuilder,
}: CompanyStepProps) => {
  const canOpenBuilder = connected && agentCount > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
            <Building2 className="h-5 w-5 text-amber-700" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">AI로 연구팀 구성하기</p>
            <p className="text-xs leading-5 text-muted-foreground">
              연구팀가 하는 일을 설명하면 전문 연구원, 작업 파일, 역할 지침을 갖춘 전체 조직 구조로
              만들어 줍니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          {
            icon: Sparkles,
            title: "설명 다듬기",
            description: "연결된 런타임으로 연구팀 설명 프롬프트를 더 구체적으로 다듬습니다.",
          },
          {
            icon: Users,
            title: "팀 생성",
            description: "역할, 책임, 인수인계가 담긴 실용적인 조직도를 만듭니다.",
          },
          {
            icon: Wand2,
            title: "한 번에 만들기",
            description: "연구원 파일을 작성하고 연결된 런타임에 팀을 바로 만듭니다.",
          },
        ].map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-md border border-border bg-surface-2 px-3 py-3"
          >
            <Icon className="h-4 w-4 text-foreground" />
            <p className="mt-2 text-[12px] font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-[12px] leading-4 text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>

      <div className="pt-4">
        {canOpenBuilder ? (
          <div className="flex justify-center">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-[#1a1206] transition-colors hover:bg-amber-400"
              onClick={onOpenCompanyBuilder}
            >
              <Sparkles className="h-3.5 w-3.5" />
              연구팀 빌더 열기
            </button>
          </div>
        ) : (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-700">
            AI로 연구팀를 생성하려면 런타임에 연결하고 기획 연구원를 1명 이상 준비해 두세요.
          </div>
        )}
      </div>
    </div>
  );
};
