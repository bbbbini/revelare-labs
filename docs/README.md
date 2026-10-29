# 프로젝트 문서 안내

현재 REVELARE 작업과 Hermes3D 기반 문서를 구분해 읽는다. 아래의 설계·로드맵은 구현 완료를 뜻하지 않으며, 현재 범위와 진행 상태는 SPEC과 PROGRESS를 기준으로 한다.

## 먼저 읽을 문서

| 목적 | 문서 |
| --- | --- |
| 현재 상태, 남은 문제, 다음 작업 | [PROGRESS](../PROGRESS.md) |
| 제품 요구사항과 작업 범위 | [SPEC](../SPEC.md) |
| Labs Runtime, 연구실 코드 위치, 공개 빌드 분리 설계 | [CODEMAP](CODEMAP.md) |
| 실행·환경변수·기본 명령 | [README](../README.md) |
| 기여 절차와 테스트 | [CONTRIBUTING](../CONTRIBUTING.md) |

## 현재 앱과 시안의 구분

- 저장소의 `/office`는 Hermes3D 기반 앱이다. Labs Runtime 연결과 기존 3D/픽셀 렌더러가 여기에 있다.
- 새 2D 아이소메트릭 연구실은 별도 비공개 시안이다. 현재 후보는 `floor-23`이며 공개 앱과 실제 에이전트에 연결되지 않았다.
- 상용 품질을 목표로 개선 중이며, 기능 검사 통과와 애니메이션의 시각적 완성도는 따로 평가한다.
- 비공개 이미지·검증 화면·토큰·로컬 설정은 이 문서 폴더에 복사하지 않는다.

## 기반 구조와 연결 문서

- [Architecture](../ARCHITECTURE.md), [Code Documentation](../CODE_DOCUMENTATION.md): Hermes3D 구조와 확장 지점.
- [Runtime Profiles](runtime-profiles.md), [Custom Provider Reference](integrations/custom-provider-reference.md): 연결 설정과 HTTP 계약.
- [Hermes Gateway](hermes-gateway.md), [Tailscale 연결](hermes-agent-tailscale.md), [Tutorial](../TUTORIAL.md): Hermes 연결 경로.
- [Multi-Agent Beta](multi-agent-beta.md), [Office Conversation Bridge](office-conversation-bridge.md): 선택적 원격 연결과 이벤트 통합.
- [Permissions and Sandboxing](permissions-sandboxing.md), [Security](../SECURITY.md): 권한과 보안 경계.

## 참고 설계와 로드맵

이 문서들은 Hermes3D의 기능 설계·제안이다. 현재 REVELARE의 승인 범위나 다음 작업 순서를 대신하지 않는다.

- [기반 로드맵](roadmap.md), [오피스 시스템 로드맵](office-systems-roadmap.md)
- [게시판](bulletin-board-spec.md), [화이트보드](whiteboard-spec.md), [회의 워크플로](meeting-room-workflow-spec.md)
- [QA 부서](qa-department-spec.md), [책상 성장](desk-progression-spec.md), [조직과 팀](hierarchy-and-teams-spec.md), [에이전트 상태](agent-state-model-spec.md)
- [런타임 프로필 구조](integrations/runtime-profile-architecture.md), [백엔드 확장 계획](integrations/universal-backend-plan.md)

## 과거 작업 기록

[2026-10-29까지의 상세 진행 기록](history/2026-10-29-progress.md)은 당시의 구현·검증·실패·정정을 보존한 자료이다. 그 안의 상태와 NEXT는 당시 기록이며 현재 작업 지시가 아니다. 최신 상태는 루트 PROGRESS에서 확인한다.

## 문서 유지 방식

현재 요구사항은 SPEC, 현재 상태와 NEXT는 PROGRESS, 코드 위치는 CODEMAP에 기록한다. 상세 과거 기록은 `docs/history/`에 보존하고 여기서 연결한다. 같은 설계 본문을 여러 경로에 복사하지 않는다. 문서를 이동하거나 통합할 때는 기존 링크와 코드·설정의 참조를 확인한다.
