/**
 * PrerequisitesStep — Tells users what they need before connecting.
 *
 * The default backend is the local Labs Runtime (custom backend), so only its
 * preparation is listed. Hermes-specific setup is shown on the connect step
 * when the Hermes backend is selected.
 */
import { CheckCircle2 } from "lucide-react";

const prerequisites = [
  {
    label: "비공개 폴더와 토큰 만들기 (처음 한 번)",
    detail: "레포 밖 비공개 폴더에 런타임 토큰과 설정을 만듭니다. 이미 했다면 건너뜁니다.",
    command: "npm run labs-runtime:init",
  },
  {
    label: "Labs Runtime 실행",
    detail: "127.0.0.1:7770에서 연구원 researcher-1을 실행합니다. 기본 provider는 claude입니다.",
    command: "npm run labs-runtime",
  },
  {
    label: "claude CLI 로그인",
    detail: "연구원 답변은 이 컴퓨터의 claude -p(설정에 따라 codex exec)로 만듭니다. API 키는 필요 없습니다.",
  },
  {
    label: "토큰은 입력하지 않아도 됩니다",
    detail:
      "Studio를 CUSTOM_RUNTIME_ALLOWLIST=127.0.0.1, CUSTOM_RUNTIME_TOKEN_FILE과 함께 실행하면 서버가 토큰을 자동으로 붙입니다.",
  },
] as const;

export const PrerequisitesStep = () => (
  <div className="space-y-2.5">
    <p className="text-[13px] leading-5 text-white/70">
      기본 연구원은 이 컴퓨터의 Labs Runtime으로 동작합니다. 레포 폴더에서 아래 항목을
      준비하세요. Labs Runtime이 이미 실행 중이라면 이 단계를 건너뛰어도 됩니다.
    </p>

    <div className="space-y-1.5">
      {prerequisites.map(({ label, detail, ...rest }) => (
        <div
          key={label}
          className="flex gap-2.5 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2"
        >
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-white">{label}</p>
            <p className="mt-0.5 text-[10px] leading-4 text-white/55">{detail}</p>
            {"command" in rest ? (
              <code className="mt-1 block rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                {rest.command}
              </code>
            ) : null}
          </div>
        </div>
      ))}
    </div>

    <p className="text-[10px] leading-4 text-white/40">
      데모나 Hermes 게이트웨이를 쓰려면 다음 단계에서 백엔드를 바꾸면 필요한 준비가
      표시됩니다. 원본 프로젝트:{" "}
      <a
        href="https://github.com/iamlukethedev/Hermes3D"
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-300/70 hover:text-amber-200"
      >
        Hermes3D 저장소
      </a>
    </p>
  </div>
);
