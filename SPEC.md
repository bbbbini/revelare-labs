# SPEC — REVELARE Security Labs

Phase별 기능 번호 목록. 구현 상태는 `PROGRESS.md`에 기록한다.

## Phase 1 — 비공개 런타임 뼈대와 연구원 1명

- P1-1 레포 준비: Hermes3D 포크 클론, 의존성 설치.
- P1-2 데모 모드 확인: `npm run demo-gateway` + `npm run dev`가 127.0.0.1에서 실행되고 브라우저에서 오피스와 데모 에이전트가 보인다.
- P1-3 코드 지도: `docs/CODEMAP.md`
  - 3D/2D 오피스 방·레이아웃 정의 위치
  - 에이전트 목록·상태 표시 위치
  - 커스텀 런타임 연결부 위치
  - 공개 빌드에서 제외할 기능과 제외 설계(UI 숨김이 아니라 공개 산출물의 entrypoint/import graph에 관련 코드·서버 경로가 없도록 하는 설계와 검증 방법). Phase 1에서는 설계만 하고 구현하지 않는다.
- P1-4 Labs Runtime 최소 구현 (`runtime/`)
  - `127.0.0.1:7770`에만 바인딩, 토큰 인증
  - 연구원 1명 `researcher-1`만 등록
  - `GET /health`, `GET /state`, `GET /registry`, `POST /v1/chat/completions`
  - 제공자 추상화: `claude -p`, `codex exec` 두 제공자 구현, 설정으로 선택, 기본 `claude`
  - 작업 큐 기본 동시성 1, 큐 길이 제한, CLI 타임아웃과 출력 크기 제한
  - API 키 사용 금지, CLI는 비공개 작업 디렉터리에서 실행
- P1-5 비공개 폴더: 레포 밖 `~/security-labs-private/` 구조 생성. 연구 산출물·토큰·로컬 상태는 이곳에만 둔다.
- P1-6 연결 확인: Hermes3D에서 커스텀 런타임에 연결해, 오피스에 연구원 1명이 보이고 질문하면 답하며 작업 중에는 상태가 working으로 바뀐다. `CUSTOM_RUNTIME_ALLOWLIST=127.0.0.1`.

### Phase 1 범위 밖
두 번째 연구원, HTB/CVE 기능, 공개 빌드 구현, 배포, UI 리디자인, 외부 네트워크 노출.

## 이후 Phase (참고)
- Phase 2: HTB writeup 작업 (비공개 저장 전용)
- Phase 3: 블로그·신기술 정리 작업과 발행 승인 흐름
- Phase 4: 공개 빌드 분리와 배포
