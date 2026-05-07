// ─────────────────────────────────────────────
//  @opspilot/chat-core  —  Agent API Chat Client
//  For the /api/agent/chat/stream endpoint
// ─────────────────────────────────────────────

import type {
  ChatClient,
  SseEvent,
  SseEventType,
} from "../types";

/**
 * Maps raw server event.type strings to our canonical SseEventType.
 * Extend this map based on what your agent API actually returns.
 */
const EVENT_TYPE_MAP: Record<string, SseEventType> = {
  THINKING: "THINKING",
  THINK: "THINKING",
  DECISION: "DECISION",
  BUILDING_CONTEXT: "TOOL_EXECUTION", // Map to TOOL_EXECUTION for UI display
  TOOL_EXECUTION: "TOOL_EXECUTION",
  TOOL: "TOOL_EXECUTION",
  COMPLETED: "COMPLETED",
  DONE: "COMPLETED",
  ERROR: "ERROR",
  STREAM_CHUNK: "STREAM_CHUNK",
  CHUNK: "STREAM_CHUNK",
  // Add more mappings based on your agent API response format
};

function normaliseEventType(raw: string): SseEventType {
  return EVENT_TYPE_MAP[raw?.toUpperCase()] ?? "STREAM_CHUNK";
}

function parseEvent(data: string): SseEvent | null {
  try {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      type: normaliseEventType(parsed.type ?? "STREAM_CHUNK"),
    } as SseEvent;
  } catch {
    // If the server sends plain text chunks, wrap them as STREAM_CHUNK
    if (data && data !== "[DONE]") {
      return { type: "STREAM_CHUNK", chunk: data };
    }
    return null;
  }
}

export interface AgentChatClientOptions {
  /** Base URL of your agent API */
  baseUrl: string;
  /** Team parameter for the agent API */
  team: string;
  /** Extra request headers (auth tokens, etc.) */
  headers?: Record<string, string>;
  /** Path for the agent stream endpoint (default: "/api/agent/chat/stream") */
  streamPath?: string;
}

export class AgentChatClient implements ChatClient {
  private readonly baseUrl: string;
  private readonly team: string;
  private readonly headers: Record<string, string>;
  private readonly streamPath: string;

  constructor(options: AgentChatClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.team = options.team;
    this.headers = {
      Accept: "text/event-stream",
      ...options.headers,
    };
    this.streamPath = options.streamPath ?? "/api/agent/chat/stream";
  }

  /**
   * Simulate typing effect by breaking message into chunks
   * Similar to ChatGPT's character-by-character streaming
   */
  private simulateTypingEffect(message: string, onEvent: (event: SseEvent) => void): void {
    let currentContent = "";
    let index = 0;
    const maxChunkSize = 3; // 1-3 characters per chunk
    let speed = 80; // Start slow (80ms per chunk)
    const minSpeed = 8; // Accelerate down to 8ms
    const speedDecrease = 2; // Reduce delay by 2ms each chunk

    const typeNextChunk = () => {
      if (index < message.length) {
        // Take 1-3 characters
        const chunkSize = Math.min(maxChunkSize, Math.max(1, Math.floor(Math.random() * maxChunkSize) + 1));
        const chunk = message.slice(index, index + chunkSize);
        currentContent += chunk;
        index += chunkSize;

        // Send chunk event
        onEvent({
          type: "STREAM_CHUNK",
          chunk: chunk
        });

        // Accelerate typing speed
        if (speed > minSpeed) {
          speed = Math.max(minSpeed, speed - speedDecrease);
        }

        // Schedule next chunk
        setTimeout(typeNextChunk, speed);
      } else {
        // Finished typing, send completion
        onEvent({
          type: "COMPLETED",
          message: message
        });
      }
    };

    // Start typing effect
    setTimeout(typeNextChunk, speed);
  }

  /**
   * Opens an SSE connection to the agent API using GET with query parameters.
   * Returns a cleanup function that aborts the request.
   */
  stream(input: string, onEvent: (event: SseEvent) => void): () => void {
    console.log('🚀 AgentChatClient.stream() called with input:', input);
    const controller = new AbortController();
    
    // Construct URL with query parameters
    const searchParams = new URLSearchParams({
      query: input,
      team: this.team,
    });
    
    const url = `${this.baseUrl}${this.streamPath}?${searchParams.toString()}`;

    (async () => {
      try {
        console.log('🌐 AgentChatClient: Starting fetch to:', url);
        console.log('🌐 AgentChatClient: Headers:', this.headers);
        
        const response = await fetch(url, {
          method: "GET",
          headers: this.headers,
          signal: controller.signal,
        });
        
        console.log('📡 AgentChatClient: Response status:', response.status);
        console.log('📡 AgentChatClient: Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          console.error('❌ AgentChatClient: Response not OK:', response.status, response.statusText);
          onEvent({
            type: "ERROR",
            message: `HTTP ${response.status}: ${response.statusText}`,
          });
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          console.error('❌ AgentChatClient: No response body stream');
          onEvent({ type: "ERROR", message: "No response body stream." });
          return;
        }

        console.log('📖 AgentChatClient: Starting to read stream...');
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEventType: string | null = null;
        let chunkCount = 0;
        let hasReceivedCompleted = false;

        while (true) {
          const { done, value } = await reader.read();
          chunkCount++;
          console.log('📖 AgentChatClient: Read chunk', chunkCount, 'done:', done, 'bytes:', value?.length);
          
          if (done) {
            console.log('📖 AgentChatClient: Stream ended after', chunkCount, 'chunks');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('📖 AgentChatClient: Decoded chunk:', JSON.stringify(chunk));
          
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";   // keep incomplete last line
          
          console.log('📖 AgentChatClient: Split into', lines.length, 'lines');

          for (const line of lines) {
            const trimmed = line.trim();
            // Process SSE line

            if (trimmed.startsWith("event:")) {
              // Extract event type
              currentEventType = trimmed.slice(6).trim();
              // Event type extracted
            } else if (trimmed.startsWith("data:")) {
              const raw = trimmed.slice(5).trim();
              if (!raw || raw === "[DONE]") continue;
              
              try {
                const parsed = JSON.parse(raw);
                // Parse JSON data
                
                // Use the event type from the event: line if available
                const event: SseEvent = {
                  type: normaliseEventType(currentEventType || parsed.type || "STREAM_CHUNK"),
                  message: parsed.message,
                  chunk: parsed.chunk,
                  result: parsed.result,
                  metadata: parsed.metadata || parsed.data,
                };
                // Send event to controller
                if (event.type === "COMPLETED" && event.message) {
                  // Simulate typing effect for COMPLETED messages
                  this.simulateTypingEffect(event.message, onEvent);
                } else {
                  onEvent(event);
                }
              } catch {
                // If JSON parsing fails, treat as plain text chunk
                const event: SseEvent = {
                  type: "STREAM_CHUNK",
                  chunk: raw
                };
                onEvent(event);
              }
              
              // Reset event type after processing
              currentEventType = null;
            }
            // Ignore comment lines, id: lines, empty lines, etc.
          }
        }

        // Don't send natural completion - your Agent API always sends its own COMPLETED event
        // This prevents duplicate COMPLETED events that would overwrite the real response
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
 * Factory helper for creating an Agent API chat client.
 *
 * ```ts
 * import { createAgentChatClient } from "@opspilot/chat-core";
 * const client = createAgentChatClient({ 
 *   baseUrl: process.env.AGENT_API_BASE_URL,
 *   team: process.env.AGENT_API_TEAM,
 *   headers: {
 *     "Authorization": `Bearer ${process.env.AGENT_API_TOKEN}`
 *   }
 * });
 * ```
 */
export function createAgentChatClient(options: AgentChatClientOptions): ChatClient {
  return new AgentChatClient(options);
}