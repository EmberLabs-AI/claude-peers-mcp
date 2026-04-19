// Unique ID for each Claude Code instance (generated on registration)
export type PeerId = string;

export interface Peer {
  id: PeerId;
  pid: number;
  cwd: string;
  git_root: string | null;
  tty: string | null;
  summary: string;
  registered_at: string; // ISO timestamp
  last_seen: string; // ISO timestamp
}

export interface Message {
  id: number;
  from_id: PeerId;
  to_id: PeerId;
  text: string;
  sent_at: string; // ISO timestamp
  delivered: boolean;
}

// --- Broker API types ---

export interface RegisterRequest {
  pid: number;
  cwd: string;
  git_root: string | null;
  tty: string | null;
  summary: string;
  // Host identifier (os.hostname()). Required for cross-machine peer
  // uniqueness — PIDs alone collide across machines since each host has
  // its own ~15-17 bit PID space. Optional on the wire for backwards compat
  // with pre-fix clients; broker treats missing/empty as "unknown-host".
  machine_id?: string;
}

export interface RegisterResponse {
  id: PeerId;
}

export interface HeartbeatRequest {
  id: PeerId;
}

export interface HeartbeatResponse {
  ok: boolean;
  // When true, the broker's heartbeat UPDATE affected 0 rows — the peer id
  // no longer exists in the registry (most likely evicted by another
  // client's /register call with a colliding pid). Client should treat
  // this as a signal to re-run /register with its full context.
  stale?: boolean;
}

export interface SetSummaryRequest {
  id: PeerId;
  summary: string;
}

export interface ListPeersRequest {
  scope: "machine" | "directory" | "repo";
  // The requesting peer's context (used for filtering)
  cwd: string;
  git_root: string | null;
  exclude_id?: PeerId;
}

export interface SendMessageRequest {
  from_id: PeerId;
  to_id: PeerId;
  text: string;
}

export interface PollMessagesRequest {
  id: PeerId;
  // If false, the broker returns undelivered messages WITHOUT marking them
  // delivered. The caller must then call /ack with the message IDs it handled.
  // Default true preserves the original behavior for older clients.
  ack?: boolean;
}

export interface PollMessagesResponse {
  messages: Message[];
}

export interface AckMessagesRequest {
  id: PeerId;
  ids: number[];
}
