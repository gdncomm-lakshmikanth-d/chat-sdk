import { describe, it, expect, vi } from "vitest";
import { ChatController } from "../controller/ChatController";
import type { ChatClient, SseEvent } from "../types";

// Mock ChatClient for testing
class TestChatClient implements ChatClient {
  private onEventCallback?: (event: SseEvent) => void;
  
  stream(input: string, onEvent: (event: SseEvent) => void): () => void {
    this.onEventCallback = onEvent;
    return () => {
      this.onEventCallback = undefined;
    };
  }

  // Helper method to simulate events
  simulateEvent(event: SseEvent) {
    this.onEventCallback?.(event);
  }
}

describe("ChatController", () => {
  it("should handle message sending and streaming", () => {
    const client = new TestChatClient();
    const controller = new ChatController(client);
    
    const states: any[] = [];
    controller.subscribe((state) => {
      states.push({ ...state });
    });

    // Send a message
    controller.sendMessage("Hello");

    // Check initial state
    expect(states).toHaveLength(2); // Initial empty state + after sendMessage
    const currentState = states[1];
    expect(currentState.messages).toHaveLength(2); // User message + empty assistant message
    expect(currentState.messages[0].role).toBe("user");
    expect(currentState.messages[0].content).toBe("Hello");
    expect(currentState.messages[1].role).toBe("assistant");
    expect(currentState.messages[1].isStreaming).toBe(true);
    expect(currentState.isStreaming).toBe(true);

    // Simulate streaming chunks
    client.simulateEvent({ type: "STREAM_CHUNK", chunk: "Hi " });
    client.simulateEvent({ type: "STREAM_CHUNK", chunk: "there!" });
    
    // Check streaming updates
    const latestState = controller.getState();
    expect(latestState.messages[1].content).toBe("Hi there!");
    expect(latestState.messages[1].isStreaming).toBe(true);

    // Complete the stream
    client.simulateEvent({ type: "COMPLETED" });
    
    const finalState = controller.getState();
    expect(finalState.messages[1].isStreaming).toBe(false);
    expect(finalState.isStreaming).toBe(false);
  });

  it("should handle agent steps", () => {
    const client = new TestChatClient();
    const controller = new ChatController(client);
    
    controller.sendMessage("Test");
    
    // Simulate agent steps
    client.simulateEvent({ type: "THINKING", message: "Analyzing request..." });
    client.simulateEvent({ type: "DECISION", message: "Decided to query database" });
    client.simulateEvent({ type: "TOOL_EXECUTION", message: "Running query..." });

    const state = controller.getState();
    expect(state.steps).toHaveLength(3);
    expect(state.steps[0].type).toBe("THINK");
    expect(state.steps[1].type).toBe("DECISION");
    expect(state.steps[2].type).toBe("TOOL");
  });

  it("should clear steps on new message", () => {
    const client = new TestChatClient();
    const controller = new ChatController(client);
    
    // First message with steps
    controller.sendMessage("First");
    client.simulateEvent({ type: "THINKING", message: "Step 1" });
    client.simulateEvent({ type: "COMPLETED" });
    
    expect(controller.getState().steps).toHaveLength(1);
    
    // Second message should clear steps
    controller.sendMessage("Second");
    
    expect(controller.getState().steps).toHaveLength(0);
  });
});