import { describe, it, expect, vi } from "vitest";
import { MockChatClient } from "../client/MockChatClient";
import type { SseEvent } from "../types";

describe("MockChatClient", () => {
  it("should replay events with correct timing", async () => {
    const events: SseEvent[] = [];
    const mockEvents: SseEvent[] = [
      { type: "THINKING", message: "Test thinking" },
      { type: "COMPLETED", result: "Test completed" },
    ];

    const client = new MockChatClient({
      script: mockEvents,
      eventDelayMs: 10, // Fast for testing
    });

    const cancel = client.stream("test input", (event) => {
      events.push(event);
    });

    // Wait for events to be processed
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(mockEvents[0]);
    expect(events[1]).toEqual(mockEvents[1]);

    cancel();
  });

  it("should allow cancellation", async () => {
    const events: SseEvent[] = [];
    const mockEvents: SseEvent[] = [
      { type: "THINKING", message: "Test 1" },
      { type: "THINKING", message: "Test 2" },
    ];

    const client = new MockChatClient({
      script: mockEvents,
      eventDelayMs: 20,
    });

    const cancel = client.stream("test input", (event) => {
      events.push(event);
    });

    // Cancel immediately
    cancel();

    // Wait to see if events still fire
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(events).toHaveLength(0);
  });
});