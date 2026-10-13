# CODEMAP

이 문서는 REVELARE Security Labs가 Hermes3D 코드 위에서 기능을 붙이고 공개 빌드를 분리할 때 참고하는 지도이다. 경로는 모두 레포 루트 기준이다.

## 1. 진입점과 서버

| 역할 | 위치 |
| --- | --- |
| 커스텀 Node 서버 (Next + WebSocket 프록시) | `server/index.js` |
| 게이트웨이 WebSocket 프록시 (`/api/gateway/ws`) | `server/gateway-proxy.js` |
| 바인딩 호스트 정책 (`HOST`, 공개 호스트 차단) | `server/network-policy.js` |
| 데모 게이트웨이 | `server/demo-gateway-adapter.js` |
| 첫 화면 리다이렉트 → `/office` | `src/app/page.tsx` |
| 오피스 페이지 | `src/app/office/page.tsx` → `src/features/office/screens/OfficeScreen.tsx` |
| Studio 설정 저장 위치 (`HERMES_STATE_DIR`) | `src/lib/hermes/paths.ts`, `src/lib/studio/settings-store.ts` |

`OfficeScreen.tsx`는 약 5,600줄짜리 화면 컴포넌트이다. 렌더러, 채팅, 연결, 작업 보드, 음성, Spotify, 전화·문자, GitHub 기능을 모두 이 한 곳에서 조립한다(import 84개).

## 2. 오피스 방과 레이아웃

| 대상 | 위치 |
| --- | --- |
| 렌더러 선택 (3D/2D) | `src/features/office/renderMode.ts` |
| 3D 오피스 렌더러 | `src/features/retro-office/RetroOffice3D.tsx` |
| 3D 방 경계·벽·문 좌표 상수 (gym, QA lab, east wing 등) | `src/features/retro-office/core/constants.ts` |
| 3D 기본 가구 배치와 방 구성 | `src/features/retro-office/core/furnitureDefaults.ts` |
| 3D 구역(district)과 캔버스 크기 | `src/features/retro-office/core/district.ts` |
| 3D 레이아웃 저장과 마이그레이션 | `src/features/retro-office/core/persistence.ts` |
| 3D 오브젝트·씬 | `src/features/retro-office/objects/`, `src/features/retro-office/scene/` |
| 2D 픽셀 오피스 맵 (방 이름, 타일 좌표) | `src/features/pixel-office/map/hermesHqMap.ts` |
| 2D 렌더러 | `src/features/pixel-office/PixelOffice2D.tsx`, `src/features/pixel-office/scene/` |
| 층(floor) 정의 | `src/lib/office/floors.ts` |
| 장소(places)·경로 탐색 | `src/lib/office/places.ts`, `src/lib/office/pathfinding.ts` |
| 레이아웃 편집기 | `src/app/office/builder/page.tsx`, `src/features/office/components/OfficeBuilderPanel.tsx` |
| 레이아웃 API | `src/app/api/office/layout/` |

## 3. 에이전트 목록과 상태 표시

| 대상 | 위치 |
| --- | --- |
| 에이전트 상태 저장소 (`AgentStatus = idle \| running \| error`) | `src/features/agents/state/store.tsx` |
| 런타임 이벤트 → 상태 반영 | `src/features/agents/state/runtime*.ts`, `gatewayRuntimeEventHandler.ts` |
| 오피스용 working 판정 (`status === "running"` 또는 `runId` 있음) | `src/features/office/screens/OfficeScreen.tsx` (`isWorking`) |
| 상단 working/idle 수 표시 | 2D `src/features/pixel-office/PixelOffice2D.tsx` (`workingCount`), 3D `src/features/retro-office/RetroOffice3D.tsx` |
| 3D 에이전트 아바타 | `src/features/retro-office/objects/agents.tsx` |
| 사이드바 에이전트 목록 | `src/features/agents/components/FleetSidebar.tsx` |
| 채팅 패널 | `src/features/agents/components/AgentChatPanel.tsx` |

## 4. 커스텀 런타임 연결부

브라우저는 런타임에 직접 연결하지 않는다. Next 서버의 프록시 라우트를 거친다.

1. 어댑터 선택: `src/lib/runtime/createRuntimeProvider.ts`. Studio 설정의 adapter가 `custom`(또는 `local`, `hermes3d`)이면 `CustomRuntimeProvider`를 만든다.
2. 런타임 호출: `src/lib/runtime/custom/provider.ts`
   - `GET /health`, `GET /state`, `GET /registry`로 런타임을 설명하고 에이전트를 만든다. 에이전트는 `state.active`의 키, 없으면 `state.identity`(`name`, `role`, `lane`, `model_id`)에서 1명을 만든다.
   - 채팅은 `POST /v1/chat/completions`(`stream: false`)로 보낸다. 응답은 OpenAI 형식의 `choices[0].message.content`를 쓴다. 대화 기록은 브라우저 메모리에 있고 매 요청마다 전체 messages를 보낸다.
3. 브라우저 → 서버: `src/lib/runtime/custom/http.ts`가 `POST /api/runtime/custom`에 `{runtimeUrl, pathname, method, body}`를 보낸다.
4. 서버 프록시: `src/app/api/runtime/custom/route.ts`. 허용 호스트 목록은 `CUSTOM_RUNTIME_ALLOWLIST` 또는 `UPSTREAM_ALLOWLIST`이다. 목록이 없으면 production이 아닐 때 모든 호스트를 허용한다. 허용 목록이 명시되어 있으면 `CUSTOM_RUNTIME_TOKEN_FILE`(또는 `CUSTOM_RUNTIME_TOKEN`)의 토큰을 서버 측에서 `Authorization: Bearer`로 붙인다. 토큰은 브라우저에 전달되지 않는다.
   - 세션 설정 동기화(`sessions.patch`)는 provider 안에서 모델 선택만 기억하고 성공을 돌려준다. upstream에는 이 메서드가 없어 채팅 전송이 실패했다.
5. 기본 URL: `src/lib/studio/settings.ts`의 `DEFAULT_CUSTOM_RUNTIME_URL = "http://localhost:7770"`. 환경변수 `HERMES3D_GATEWAY_URL`, `HERMES3D_GATEWAY_ADAPTER_TYPE`(`src/lib/studio/settings-store.ts`)로 지정할 수 있다.
6. 연결 화면: `src/features/agents/components/GatewayConnectScreen.tsx`의 "Custom backend" 버튼.

## 5. 공개 빌드에서 제외할 기능

| 기능 | 대표 위치 |
| --- | --- |
| 런타임·게이트웨이 연결 | `src/lib/gateway/**`, `src/lib/runtime/**`, `server/**`, `src/app/api/runtime/**`, `src/app/api/gateway/**` |
| 연결 설정 UI | `GatewayConnectScreen.tsx`, `ConnectionPanel.tsx`, `src/features/office/components/panels/SettingsPanel.tsx`, `src/features/onboarding/**` |
| 채팅·작업 지시 | `AgentChatPanel.tsx`, `src/features/office/components/RemoteAgentChatPanel.tsx`, `src/features/agents/approvals/**`, `src/features/office/tasks/**`, `src/app/api/task-store/**` |
| 관리 (에이전트 생성·편집, 스킬, 마켓플레이스, 빌더) | `src/features/agents/creation/**`, `AgentCreate*`, `AgentEditorModal.tsx`, `AgentSkills*`, `SkillsMarketplace*`, `src/features/company-builder/**`, `src/app/agents/**`, `src/app/office/builder/**` |
| Spotify | `src/features/spotify-jukebox/**`, `src/app/spotify/**` |
| 음성 | `src/lib/voice/**`, `src/lib/voiceReply/**`, `src/app/api/office/voice/**` |
| 전화·문자·GitHub·브라우저 미리보기·스탠드업 | `src/lib/office/{call,text,github.ts,browserPreview.ts,standup}`, `src/app/api/office/**` |
| 파일 업로드·SSH | `src/app/api/files/**`, `src/lib/ssh/**` |
| 비공개 런타임 | `runtime/` (레포 최상위, Phase 1에서 추가) |

현재 렌더러도 이 기능들과 얽혀 있다. `RetroOffice3D.tsx`는 `SettingsPanel`, `src/lib/studio/settings`, 몰입형 화면(Kanban, GitHub, Phone, SMS, Standup, ATM)을 import한다. 따라서 렌더러를 그대로 공개 빌드에 넣으면 관리 코드가 따라 들어간다.

## 6. 공개 빌드 분리 설계

목표는 화면에서 숨기는 것이 아니다. 공개 산출물에 위 기능의 코드, API 라우트, 서버 경로가 아예 존재하지 않게 하는 것이다. Phase 1에서는 설계만 하고 구현하지 않는다(구현은 Phase 4).

### 6.1 별도 entrypoint와 별도 빌드
- 공개 사이트는 별도 Next 앱 디렉터리(예: `public-site/`)로 두고, 자체 `next.config`와 `tsconfig`를 갖는다. `output: "export"`로 정적 빌드한다. 정적 export에서는 API 라우트와 커스텀 서버를 쓸 수 없으므로 서버 경로가 구조적으로 들어가지 않는다.
- 배포 대상(Vercel)은 이 디렉터리만 빌드한다. 기존 `src/app`과 `server/`는 공개 빌드 입력이 아니다.
- 공개 페이지는 실시간 게이트웨이 대신 빌드 시점의 정적 스냅샷(연구원 이름, 아바타, 자리, 표시용 상태)과 `content/published/`의 글만 입력으로 쓴다.

### 6.2 공유 코드는 허용 목록으로만
- 공개 앱이 import할 수 있는 공유 모듈을 허용 목록으로 정한다. 예: 맵·레이아웃 정의(`hermesHqMap.ts`, `retro-office/core/constants.ts`, `furnitureDefaults.ts`), 아바타 프로필, 순수 씬·오브젝트 코드.
- `RetroOffice3D.tsx`와 `PixelOffice2D.tsx`처럼 관리 기능과 얽힌 렌더러는 Phase 4에서 읽기 전용 렌더러 층과 상호작용 층으로 나눈다. 공개 앱은 읽기 전용 층만 import한다.

### 6.3 발행 콘텐츠 허용 목록
- `content/published/`의 글은 front matter의 `type`이 `blog` 또는 `tech-note`일 때만 빌드에 포함한다. 그 밖의 타입이 있으면 빌드를 실패시킨다.
- CVE·취약점 상세, 재현 절차, PoC, 미패치 이슈, 제보 내용, HTB 활성 머신 정보는 비공개 폴더에만 존재하고 공개 레포 경로로 들어오지 않는다.

### 6.4 검증 (배포 전 필수, 하나라도 실패하면 배포 중단)
1. import 그래프 검사: 공개 entrypoint에서 출발해 TypeScript 모듈 해석으로 도달 가능한 파일 전체를 구한다. 5절의 거부 경로(`src/lib/gateway/**`, `src/lib/runtime/**`, `server/**`, `runtime/**`, `src/app/api/**`, 채팅·연결·관리·Spotify·음성 모듈)에 하나라도 닿으면 실패한다. 이미 있는 `typescript` 패키지로 스크립트를 만들면 의존성을 추가하지 않아도 된다.
2. 산출물 문자열 검사: 정적 export 결과물(JS, HTML, source map 포함)에서 금지 표식을 찾는다. 예: `/api/runtime/custom`, `/api/gateway/ws`, `/v1/chat/completions`, `chat.send`, `:7770`, `CUSTOM_RUNTIME`, `spotify`, `elevenlabs`, `security-labs-private`.
3. 라우트 검사: 산출물에 `api/` 경로와 서버 함수가 없다.
4. 콘텐츠 검사: 6.3의 타입 허용 목록과 금지 키워드 검사.

## 7. 비공개 런타임 (Phase 1)

`runtime/`은 레포 최상위의 독립 Node 프로세스이다. 외부 의존성이 없고, `src/`에서 import하지 않으며, 공개 빌드 입력에도 포함되지 않는다.

| 파일 | 역할 |
| --- | --- |
| `runtime/server.js` | HTTP 서버. `127.0.0.1:7770`에만 바인딩. 모든 경로에 bearer 토큰 필요. Host 헤더 검사로 DNS rebinding 차단 |
| `runtime/config.js` | 비공개 경로, 연구원 목록(`researcher-1`), provider 선택, 제한값 |
| `runtime/providers.js` | `claude -p`, `codex exec` 실행. prompt는 stdin으로 넘기고, 연구원 비공개 작업 디렉터리에서 실행. timeout과 출력 크기 제한. API 키 환경변수 제거 |
| `runtime/queue.js` | 작업 큐. 기본 동시 실행 1, 대기 최대 4 (초과 시 429) |
| `runtime/prompt.js` | OpenAI 형식 messages를 한 번의 CLI 호출용 prompt로 변환 (길이 제한) |
| `runtime/init-private.js` | 비공개 폴더 구조와 토큰(0600) 생성. 레포 안 경로는 거부 |
| `runtime/test/` | `npm run test:runtime` (node:test, CLI는 가짜 spawn으로 대체) |

- provider 선택 순서: `LABS_PROVIDER` 환경변수, 비공개 `runtime/config.json`, 기본값 `claude`.
- 기본 제한: CLI 180초, 출력 64KB, prompt 32,000자, 요청 본문 256KB. 비공개 `config.json`의 `limits`로 바꿀 수 있다.
- `/state`의 `runtime.status`와 `researchers[].status`는 실행 중일 때 `working`이다. 오피스 화면의 working 표시는 채팅 요청이 진행되는 동안 브라우저 쪽 실행 상태로 표시된다.
- 로그에는 provider, 소요 시간, 글자 수, 오류 코드만 남긴다. prompt, 응답, CLI stderr는 기록하거나 반환하지 않는다.

비공개 폴더 구조(레포 밖, 권한 700):

```
~/security-labs-private/
  runtime/        token(0600), config.json
  researchers/researcher-1/workdir/   CLI 작업 디렉터리
  research/       연구 산출물
  drafts/         글 초안
  evidence/       검증 증거
  hermes3d-state/ Studio 상태 (HERMES_STATE_DIR)
```

실행 순서:

```
npm run labs-runtime:init
npm run labs-runtime
HOST=127.0.0.1 HERMES_STATE_DIR=~/security-labs-private/hermes3d-state \
  CUSTOM_RUNTIME_ALLOWLIST=127.0.0.1 \
  CUSTOM_RUNTIME_TOKEN_FILE=~/security-labs-private/runtime/token \
  npm run dev
```

Studio에서 Custom backend를 고르고 URL `http://127.0.0.1:7770`으로 연결한다.
