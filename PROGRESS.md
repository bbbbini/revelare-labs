# PROGRESS

기능 번호는 `SPEC.md` 기준.

## Phase 1

- [x] P1-1 레포 준비: 포크 클론 확인, `npm ci` 완료.
- [ ] P1-2 데모 모드: 두 서버가 127.0.0.1에서 실행되고 오피스 화면은 열림. 데모 게이트웨이 연결은 아직 `DISCONNECTED`라 미완료.
- [ ] P1-3 `docs/CODEMAP.md`
- [ ] P1-4 Labs Runtime (`runtime/`)
- [ ] P1-5 `~/security-labs-private/` 구조
- [ ] P1-6 브라우저 연결·답변·working 확인

## 메모

- dev 서버는 기본으로 `127.0.0.1`과 `::1`에 함께 바인딩한다. `HOST=127.0.0.1` 환경변수를 프로세스에 직접 주어야 127.0.0.1에만 바인딩된다(`.env`는 바인딩 결정 이후에 로드됨).

NEXT: 데모 게이트웨이 DISCONNECTED 원인 확인 후 HERMES_STATE_DIR를 비공개 폴더로 격리해 재검증
