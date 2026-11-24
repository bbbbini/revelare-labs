"use client";

/**
 * CompleteStep — Final wizard screen before entering the office.
 */
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Building2, Rocket } from "lucide-react";

export const CompleteStep = ({
  companyCreated = false,
  companyName = null,
}: {
  companyCreated?: boolean;
  companyName?: string | null;
}) => {
  const hasFiredConfettiRef = useRef(false);

  useEffect(() => {
    if (!companyCreated || hasFiredConfettiRef.current) return;
    hasFiredConfettiRef.current = true;
    const defaults = {
      spread: 68,
      startVelocity: 32,
      ticks: 220,
      gravity: 1.05,
      zIndex: 100130,
      colors: ["#67e8f9", "#fbbf24", "#fde047", "#f472b6", "#c4b5fd"],
    };
    void confetti({
      ...defaults,
      particleCount: 90,
      origin: { x: 0.5, y: 0.35 },
    });
    window.setTimeout(() => {
      void confetti({
        ...defaults,
        particleCount: 70,
        angle: 60,
        origin: { x: 0.15, y: 0.45 },
      });
      void confetti({
        ...defaults,
        particleCount: 70,
        angle: 120,
        origin: { x: 0.85, y: 0.45 },
      });
    }, 180);
  }, [companyCreated]);

  return (
    <div className="relative flex flex-col items-center justify-center gap-5 py-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15">
        <Rocket className="h-7 w-7 text-amber-700" />
      </div>

      <div className="space-y-2 text-center">
        <p className="text-base font-semibold text-foreground">
          {companyCreated
            ? `${companyName?.trim() || "연구팀"} 생성 완료`
            : "AI 연구실에 오신 것을 환영합니다"}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {companyCreated
            ? `${companyName?.trim() || "연구팀"} 준비가 끝났습니다. 새 팀이 연결된 런타임에 만들어졌고 연구실에 배치되었습니다.`
            : "게이트웨이가 연결되었고 연구원가 준비되었습니다. 안으로 들어가 AI 팀이 일하는 연구 작업 공간을 둘러보세요."}
        </p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5">
          <Building2 className="h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-xs font-medium text-foreground">
              {companyCreated ? "새 팀 만나기" : "연구실 둘러보기"}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {companyCreated
                ? "연구실를 둘러보며 새 역할을 확인하고 업무를 맡겨 보세요."
                : "방을 이동하며 연구원를 지켜보고 상호작용하세요"}
            </p>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground">
        온보딩은 연구실 설정에서 언제든 다시 실행할 수 있습니다.
      </p>
    </div>
  );
};
