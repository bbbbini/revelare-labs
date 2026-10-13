# PROGRESS

기능 번호는 `SPEC.md` 기준.

## Phase 1

- [x] P1-1 레포 준비: 포크 클론 확인, `npm ci` 완료. SPEC/PROGRESS 커밋 122c3db.
- [x] P1-2 (커밋 91e8a20, 리뷰 #2 승인. 리뷰어 독립 브라우저 데모 자동화는 미완료로 UI 결과는 builder 관측에 의존) 데모 모드: `npm run demo-gateway`(127.0.0.1:18789) + `HOST=127.0.0.1 npm run dev`(127.0.0.1:3000). 헤드리스 Chromium에서 `/office`가 `DEMO • CONNECTED`, 데모 에이전트 3명 표시, 콘솔 오류 0건. 증거 스크린샷은 레포 밖 비공개 폴더에 보관.
  - 수정 1 `server/index.js`: dev 커스텀 서버가 내부 서버의 upgrade handler를 써서 `/_next/webpack-hmr` 소켓이 CONNECTING에 멈췄고, 브라우저가 같은 호스트의 게이트웨이 소켓 handshake를 그 뒤에 대기시켜 연결이 시간 초과됨. Next router-server의 upgrade handler를 쓰도록 변경.
  - 수정 2 `OfficeScreen.tsx`: 렌더 중 `Date.now()`를 useMemo 의존값으로 써서 오피스 애니메이션 상태가 매 렌더 새 객체가 되고, 이를 의존하는 effect들이 무한 렌더("Maximum update depth exceeded")를 일으킴. 500ms 주기 state 시계로 변경.
- [x] P1-3 (커밋 ebb9065, 리뷰 #3c 승인) `docs/CODEMAP.md`: 방·레이아웃, 에이전트 상태, 커스텀 런타임 연결부, 공개 빌드 제외 대상과 분리 설계(별도 정적 entrypoint, import 그래프 검사, 산출물 문자열 검사).
- [x] P1-4 (커밋 ebb9065, 리뷰 #3·#3b 수정 후 #3c 승인) Labs Runtime (`runtime/`): 127.0.0.1:7770, 토큰, `researcher-1`, `claude -p`/`codex exec` 제공자(기본 claude), 큐 동시성 1·대기 4, CLI 180초·출력 64KB 제한. `npm run test:runtime` 24건 통과. 두 제공자 모두 무해 질문 smoke 성공(builder, 수정 후 재확인 포함). 리뷰어 독립 smoke에서도 claude·codex 각각 정답, 작업 디렉터리 잔여 파일 0.
  - 리뷰 #3 수정: JSON 객체가 아닌 본문(null 등)이 런타임을 종료시키던 문제 → 400. 비공개 경로 검사를 경로 세그먼트와 실제 경로(symlink) 기준으로 바꾸고 실행 시에도 적용. timeout·취소·출력 초과 때 CLI가 실제로 종료된 뒤에만 큐 슬롯과 working을 해제.
  - 리뷰 #3b 수정: 이미 취소된 요청은 CLI를 시작하지 않고 바로 실패(이전에는 Promise가 끝나지 않아 큐를 점유). 비공개 폴더 하위 경로·토큰·설정 파일도 쓰기 전에 레포 밖인지 실제 경로로 검사.
  - Studio 프록시(`src/app/api/runtime/custom/route.ts`)가 허용 목록이 명시된 경우에만 토큰을 서버 측에서 붙인다.
  - `CustomRuntimeProvider`에 `sessions.patch` 추가(없어서 채팅 전송이 실패했음).
- [x] P1-5 (커밋 ebb9065) `npm run labs-runtime:init`으로 레포 밖 비공개 폴더 구조와 토큰 생성.
- [x] P1-6 (builder 확인 후 리뷰어 독립 headed 3D 확인 완료) headed Chromium 3D 모드에서 Custom backend `CUSTOM • CONNECTED`, 3D 오피스에 Researcher 1 표시, 질문 중 상단 `1 working`, 한국어 답변 수신 후 idle. `CUSTOM_RUNTIME_ALLOWLIST=127.0.0.1`로 실행. 리뷰어도 독립 headed Chromium에서 3D 연구원 1명, `1 working`, 답변, idle 복귀를 확인했다. UI 검증은 claude provider로 했고, codex는 실제 CLI smoke와 공통 테스트로 확인했다(codex UI 전환은 미검증). 증거 스크린샷은 레포 밖에 보관.

## Phase 1 실행 방법

```
npm run labs-runtime:init        # 레포 밖 비공개 폴더와 토큰 생성 (한 번)
npm run labs-runtime             # 127.0.0.1:7770, 기본 provider claude
npm run demo-gateway             # (선택) 데모 확인용
HOST=127.0.0.1 HERMES_STATE_DIR=~/security-labs-private/hermes3d-state \
  CUSTOM_RUNTIME_ALLOWLIST=127.0.0.1 \
  CUSTOM_RUNTIME_TOKEN_FILE=~/security-labs-private/runtime/token \
  npm run dev                    # 127.0.0.1:3000
```

브라우저에서 `http://127.0.0.1:3000/office`를 열고 Custom backend를 고른 뒤 URL `http://127.0.0.1:7770`으로 연결한다. provider를 codex로 바꾸려면 `LABS_PROVIDER=codex npm run labs-runtime`으로 실행하거나, 비공개 `runtime/config.json`의 `researchers.researcher-1.provider`를 `codex`로 바꾼다.

## 검증하지 않은 범위

- production build(`npm run build`)와 전체 unit suite 재실행은 최종 리뷰에서 하지 않았다.
- 리뷰어의 독립 데모(P1-2) 브라우저 자동화는 끝나지 않았다. 데모 화면 결과는 builder 관측에 의존한다.
- codex provider로 연결한 상태의 UI 확인은 하지 않았다.

## 메모

- dev 서버는 기본으로 `127.0.0.1`과 `::1`에 함께 바인딩한다. `HOST=127.0.0.1` 환경변수를 프로세스에 직접 주어야 127.0.0.1에만 바인딩된다(`.env`는 바인딩 결정 이후에 로드됨).
- Studio 상태는 `HERMES_STATE_DIR`를 레포 밖 비공개 폴더로 지정해 격리한다.
- `server/index.js`는 Next 16 custom server의 `upgradeHandler`(내부 구현)에 의존한다. Next를 올릴 때 HMR 연결을 다시 확인한다.
- 기존 실패: `tests/unit/colorSemanticsGuard.test.ts` 1건은 이번 변경 전에도 실패한다.
- 커스텀 런타임 연결 시 콘솔에 `Custom runtime does not support config.get` 오류 1건이 남는다(upstream 동작, 채팅과 표시에는 영향 없음).
- CLI 응답 timeout 2건 관측: 1차는 2026-10-13 00시대(KST) 3D 채팅 검증 중 claude, 기록된 경과 1014초. 2차는 06:41~06:57(KST) codex smoke 중, 기록된 경과 986초. 두 시간대 모두 `pmset -g log`에 Idle/Maintenance Sleep 기록이 있고, 기록된 경과가 180초 제한을 크게 넘는다. 슬립으로 타이머가 멈췄을 가능성이 높지만 다른 원인은 배제하지 않았다. 같은 질문을 `caffeinate -i`로 슬립을 막고 보냈을 때는 5~6초에 성공했다.

NEXT: Phase 1 완료. Phase 2(HTB writeup, 비공개 저장 전용)는 사용자 지시 후 시작
