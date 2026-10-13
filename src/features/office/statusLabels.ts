// Korean display labels for status values. The values themselves stay
// English because they are protocol and state identifiers.

export const GATEWAY_STATUS_LABELS: Record<string, string> = {
  connected: "연결됨",
  connecting: "연결 중",
  disconnected: "연결 끊김",
  error: "오류",
};

export const AGENT_STATUS_LABELS: Record<string, string> = {
  working: "작업 중",
  idle: "대기",
  error: "오류",
  offline: "오프라인",
};
