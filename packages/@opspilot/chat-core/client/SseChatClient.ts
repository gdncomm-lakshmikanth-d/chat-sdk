// ─────────────────────────────────────────────
//  @opspilot/chat-core  —  SSE Chat Client
// ─────────────────────────────────────────────

import type {
  ChatClient,
  ChatClientOptions,
  SseEvent,
  SseEventType,
} from "../types";

/**
 * Maps raw server event.type strings to our canonical SseEventType.
 * Extend this map if your backend uses different naming.
 */
const EVENT_TYPE_MAP: Record<string, SseEventType> = {
  THINKING: "THINKING",
  THINK: "THINKING",
  DECISION: "DECISION",
  TOOL_EXECUTION: "TOOL_EXECUTION",
  TOOL: "TOOL_EXECUTION",
  COMPLETED: "COMPLETED",
  DONE: "COMPLETED",
  ERROR: "ERROR",
  STREAM_CHUNK: "STREAM_CHUNK",
  CHUNK: "STREAM_CHUNK",
};

function normaliseEventType(raw: string): SseEventType {
  return EVENT_TYPE_MAP[raw?.toUpperCase()] ?? "THINKING";
}

function parseEvent(data: string): SseEvent | null {
  try {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      type: normaliseEventType(parsed.type ?? ""),
    } as SseEvent;
  } catch {
    // If the server sends plain text (e.g. partial chunks), wrap it
    if (data && data !== "[DONE]") {
      return { type: "STREAM_CHUNK", chunk: data };
    }
    return null;
  }
}

export class SseChatClient implements ChatClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly streamPath: string;

  constructor(options: ChatClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...options.headers,
    };
    this.streamPath = options.streamPath ?? "/chat/stream";
  }

  /**
   * Opens an SSE connection, forwards parsed events to the caller.
   * Returns a cleanup function that aborts the request.
   */
  stream(input: string, onEvent: (event: SseEvent) => void): () => void {
    const controller = new AbortController();
    const url = `${this.baseUrl}${this.streamPath}`;

    (async () => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify({ message: input }),
          signal: controller.signal,
        });

        if (!response.ok) {
          onEvent({
            type: "ERROR",
            message: `HTTP ${response.status}: ${response.statusText}`,
          });
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          onEvent({ type: "ERROR", message: "No response body stream." });
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";   // keep incomplete last line

          for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith("data:")) {
              const raw = trimmed.slice(5).trim();
              if (!raw || raw === "[DONE]") continue;
              const event = parseEvent(raw);
              if (event) onEvent(event);
            }
            // Ignore comment lines, empty lines, etc.
          }
        }

        // Signal natural completion if server didn't send COMPLETED
        onEvent({ type: "COMPLETED" });
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          onEvent({
            type: "ERROR",
            message: (err as Error)?.message ?? "Stream error",
          });
        }
      }
    })();

    return () => controller.abort();
  }
}

/**
 * Factory helper — the most common entry-point for consumers.
 *
 * ```ts
 * import { createChatClient } from "@opspilot/chat-core";
 * const client = createChatClient({ baseUrl: "https://api.example.com" });
 * ```
 */
export function createChatClient(options: ChatClientOptions): ChatClient {
  return new SseChatClient(options);
}