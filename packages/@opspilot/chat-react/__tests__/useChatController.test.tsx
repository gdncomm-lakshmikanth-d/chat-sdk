import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatController } from "../hooks/useChatController";
import { MockChatClient } from "@opspilot/chat-core";

describe("useChatController", () => {
  it("should initialize with empty state", () => {
    const client = new MockChatClient({ eventDelayMs: 1 });
    const { result } = renderHook(() => useChatController(client));

    expect(result.current.messages).toEqual([]);
    expect(result.current.steps).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should provide controller methods", () => {
    const client = new MockChatClient({ eventDelayMs: 1 });
    const { result } = renderHook(() => useChatController(client));

    expect(typeof result.current.sendMessage).toBe("function");
    expect(typeof result.current.cancel).toBe("function");
    expect(typeof result.current.clearHistory).toBe("function");
    expect(result.current.controller).toBeDefined();
  });

  it("should handle message sending", async () => {
    const client = new MockChatClient({ 
      eventDelayMs: 1,
      script: [
        { type: "THINKING", message: "Processing..." },
        { type: "STREAM_CHUNK", chunk: "Hello" },
        { type: "COMPLETED" }
      ]
    });
    
    const { result } = renderHook(() => useChatController(client));

    act(() => {
      result.current.sendMessage("Test message");
    });

    // Should have user message and streaming assistant message
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].content).toBe("Test message");
    expect(result.current.isStreaming).toBe(true);

    // Wait for mock events to process
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isStreaming).toBe(false);
  });
});