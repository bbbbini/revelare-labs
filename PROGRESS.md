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

## 후속 K — 한국어 UI

- [x] K1 (커밋 4a54d22, dev-review 재리뷰 승인) `html lang="ko"`, 메타, 상단 브랜드 `REVELARE Security Labs`, 온보딩 6단계, 연결 화면, 연결 오류 문구. 온보딩 준비 단계는 Labs Runtime 준비(`labs-runtime:init`, `labs-runtime`, claude CLI 로그인, 토큰 자동 주입)만 안내한다. 연결 단계에 백엔드 선택(Labs Runtime 권장/데모/Hermes)을 두었다. 저장된 adapter와 URL은 자동으로 바꾸지 않는다. Labs Runtime 주소(`http://127.0.0.1:7770`)는 사용자가 'Labs Runtime 주소 넣기'를 눌렀을 때만 채운다(리뷰 지적 반영, 회귀 테스트 `tests/unit/onboardingConnectStep.test.ts`). Hermes 준비는 Hermes를 고른 경우에만 보인다. 연결 화면에서는 커스텀 백엔드일 때 hermes-adapter 명령 대신 Labs Runtime 안내를 보여 준다. 연결 오버레이는 배경이 항상 어두우므로 `dark` 토큰을 적용해 라이트 테마에서도 글자가 읽히게 했다.
  - 관측(원인 미확정, 보류): 2D 픽셀 모드에서 연결 후 'Maximum update depth exceeded' 반복을 1회 관측했다. 이후 격리 서버에서 변경 전 코드(b7d6ff5)와 K1 코드로 같은 조건(데모 연결 후 커스텀 전환 순서 포함)을 각 3회 재현했지만 양쪽 모두 0건이었다. 3D 경로에서는 관측되지 않았다.
  - 영어로 남긴 것: 업스트림 URL 진단 메시지(`upstreamUrlDiagnostics.ts`)는 CLI doctor(`scripts/lib/hermes3doctor-core.mjs`)와 문자열 일치를 테스트가 검사하므로 원문을 유지했다. 게이트웨이가 보낸 원본 오류 메시지는 접두어만 한국어이다.
- [x] K2 (커밋 1473433, dev-review 승인) 3D 오피스와 채팅
  - 3D 상단: 추가, 2D 전환, 런타임 상태(`custom • 연결됨`), 히트맵/경로/편집/음성 설정 툴팁, 카메라(전체 보기/안내 데스크/라운지), 칸반 보드, 스탠드업, 에이전트 수, 팀 명단, 책상 동작, 편집 모드, 하단 상태(작업 중/대기/오류, 조용함/활발함/분주함, 조작 안내).
  - 2D 상단과 룸 라벨도 같은 문구로 바꿨다.
  - 사무실 제목: 새 기본값은 `REVELARE Security Labs`이다. 저장된 제목이 원본 기본값 `Luke Headquarters`와 정확히 같을 때만 화면에 REVELARE로 표시하며, 저장값은 바꾸지 않는다. 사용자가 정한 다른 제목은 그대로 둔다.
  - 연구원 표시명: `runtime/config.js`의 name을 `연구원 1`로 바꿨다(id `researcher-1` 유지). 실행 중인 labs-runtime을 재시작해야 반영된다.
  - HQ 사이드바(본부 열기/마켓플레이스/분석, 탭 이름), 에이전트 이벤트 콘솔(JSON 복사/다운로드, 지우기, 펼치기/접기, 검색, 빈 상태), 채팅 열기/숨기기.
  - 채팅: 빈 대화 안내, 입력 placeholder, 전송/중지/첨부/마이크, 새 대화, 모델·생각 수준, 실행 승인, 기록 불러오기, 오류 문구. 기존 채팅 테스트의 선택자를 한국어로 바꿨다.
  - 3D 이름표는 troika `<Text>`로 그린다. 한글 글리프는 troika가 jsdelivr CDN에서 내려받으므로 외부 네트워크가 필요하다.
  - 영어로 남긴 것: QA 랩, GitHub, ATM, 전화/문자 부스 같은 몰입형 화면 내부 문구, 마켓플레이스와 분석 패널 본문, 런타임/adapter 식별자(`custom`, `hermes`), 모델 이름.
- [ ] K3 (리뷰 중) 설정과 화면 검증
  - Studio 설정 패널(제목, 게이트웨이, 원격 오피스, 온보딩, 렌더러, 그래픽 품질, 음성 답변), 그래픽 품질 옵션, 에이전트 설정 탭(동작/권한/스킬/시스템 설정/자동화/고급), 권한 항목(명령 실행 끔/묻기/자동, 웹 접근, 파일 도구, 브라우저 자동화), 저장 상태. 관련 테스트 선택자를 갱신했다.
  - 화면 검증(공유 3000, 읽기 전용): 별도 headless 브라우저에서 Studio 설정 GET 응답만 이 브라우저 안에서 custom `http://127.0.0.1:7770`으로 바꿨고, Studio 쓰기 요청(PUT 5건)은 모두 차단했다. runtime은 대화를 저장하지 않으며, 채팅 세션은 검증 브라우저 메모리에만 있다. 3D에서 상단 'REVELARE SECURITY LABS', '추가', 'CUSTOM • 연결됨', '1 에이전트', '칸반 보드', 우측 '본부 열기/마켓플레이스/분석', 한글 이름표 '연구원 1'(troika가 한글 글꼴을 CDN에서 200으로 받음), 채팅 '나'/'연구원 1', 입력 '메시지를 입력하세요', 첨부/마이크/전송, 생각 수준 '높음', '채팅 숨기기', 하단 콘솔을 확인했다. 질문을 보내자 '작업 중 0 → 1 → 0'으로 바뀌었고 답변 '4'를 받았다. 콘솔 오류는 기존 config.get 1건이다. 증거는 레포 밖 스크래치에 있다.
  - 채팅 사이드 목록 머리글을 '에이전트'로 바꿨다.
  - 리뷰 지적 반영: 콘솔 머리글은 줄바꿈을 허용하고 버튼은 줄바꿈하지 않게 했다(1400px·900px 모두 버튼 높이 20px, 한 줄). 전역 CSS에 `:lang(ko) { word-break: keep-all }`을 추가해 한글이 단어 중간에서 끊기지 않게 했다. 권한 도움말, 저장 실패 '저장하지 못했습니다'와 '다시 시도'(같은 저장 함수 호출 유지), 설정 백엔드 표시 '데모/로컬/커스텀'(id 유지)도 번역했다.
  - 채팅의 '동작 설정 열기'로 여는 에이전트 편집기(머리글, 파일 탭 이름과 설명, 이름/역할/분위기/이모지, 없는 파일 만들기/취소/저장, 에이전트 삭제)를 번역했다. 파일 이름(IDENTITY.md 등)은 그대로 두었다.
  - 화면 재확인(다크 1400px, 라이트 900px, 공유 3000에서 쓰기 차단): 콘솔, Studio 설정, 에이전트 편집기. 화면에 남은 영어: 브랜드명, `custom`, 'JSON', 모델 이름, 편집기의 'Gateway is not connected.'(GatewayClient 오류 문구, K4에서 처리).
- [ ] K4 로컬 Labs 자동 연결(사용자 승인 12:06Z)

NEXT: K3 리뷰 후 커밋, 이어서 K4(로컬 Labs 자동 연결과 localhost:7770 정규화)
