# PROGRESS

기능 번호는 `SPEC.md` 기준.

## Phase 1

- [x] P1-1 레포 준비: 포크 클론 확인, `npm ci` 완료.
- [x] P1-2 데모 모드: `npm run demo-gateway`(127.0.0.1:18789) + `HOST=127.0.0.1 npm run dev`(127.0.0.1:3000). 헤드리스 Chromium에서 `/office`가 `DEMO • CONNECTED`, 데모 에이전트 3명 표시, 콘솔 오류 0건. 증거 스크린샷은 레포 밖 비공개 폴더에 보관.
  - 수정 1 `server/index.js`: dev 커스텀 서버가 내부 서버의 upgrade handler를 써서 `/_next/webpack-hmr` 소켓이 CONNECTING에 멈췄고, 브라우저가 같은 호스트의 게이트웨이 소켓 handshake를 그 뒤에 대기시켜 연결이 시간 초과됨. Next router-server의 upgrade handler를 쓰도록 변경.
  - 수정 2 `OfficeScreen.tsx`: 렌더 중 `Date.now()`를 useMemo 의존값으로 써서 오피스 애니메이션 상태가 매 렌더 새 객체가 되고, 이를 의존하는 effect들이 무한 렌더("Maximum update depth exceeded")를 일으킴. 500ms 주기 state 시계로 변경.
- [ ] P1-3 `docs/CODEMAP.md`
- [ ] P1-4 Labs Runtime (`runtime/`)
- [ ] P1-5 `~/security-labs-private/` 구조
- [ ] P1-6 브라우저 연결·답변·working 확인

## 메모

- dev 서버는 기본으로 `127.0.0.1`과 `::1`에 함께 바인딩한다. `HOST=127.0.0.1` 환경변수를 프로세스에 직접 주어야 127.0.0.1에만 바인딩된다(`.env`는 바인딩 결정 이후에 로드됨).
- Studio 상태는 `HERMES_STATE_DIR`를 레포 밖 비공개 폴더로 지정해 격리한다.
- 기존 실패: `tests/unit/colorSemanticsGuard.test.ts` 1건은 이번 변경 전에도 실패한다.

NEXT: docs/CODEMAP.md 작성 (공개 빌드 분리 설계 포함)
