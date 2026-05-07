// ─────────────────────────────────────────────
//  @opspilot/chat-core  —  Domain Types
// ─────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export type AgentStepType =
  | "THINK"
  | "DECISION"
  | "TOOL"
  | "RESULT"
  | "ERROR";

export interface AgentStep {
  id: string;
  type: AgentStepType;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────
//  SSE Event types  (inbound from server)
// ─────────────────────────────────────────────

export type SseEventType =
  | "THINKING"
  | "DECISION"
  | "TOOL_EXECUTION"
  | "COMPLETED"
  | "ERROR"
  | "STREAM_CHUNK";   // optional partial-text chunks

export interface SseEvent {
  type: SseEventType;
  /** Human-readable message / partial text */
  message?: string;
  /** For STREAM_CHUNK — incremental assistant text */
  chunk?: string;
  /** For COMPLETED — full final answer (optional) */
  result?: string;
  /** Arbitrary server metadata */
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────
//  Public SDK surface
// ─────────────────────────────────────────────

export interface ChatClientOptions {
  /** Base URL of your AI backend */
  baseUrl: string;
  /** Extra request headers (auth tokens, etc.) */
  headers?: Record<string, string>;
  /** Path appended to baseUrl for the stream endpoint  (default: "/chat/stream") */
  streamPath?: string;
}

/**
 * Implement this interface to swap in any transport layer.
 * The default SseChatClient ships with the package.
 */
export interface ChatClient {
  /**
   * Start streaming a user message.
   * @param input   The user's text
   * @param onEvent Called for every parsed SSE event
   * @returns       A cancel/cleanup function
   */
  stream(input: string, onEvent: (event: SseEvent) => void): () => void;
}

export type ControllerListener = (state: ChatState) => void;

export interface ChatState {
  messages: Message[];
  steps: AgentStep[];
  isStreaming: boolean;
  error: string | null;
}