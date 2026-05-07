// ─────────────────────────────────────────────
//  @opspilot/chat-core  —  Chat Controller
// ─────────────────────────────────────────────

import type {
  AgentStep,
  AgentStepType,
  ChatClient,
  ChatState,
  ControllerListener,
  Message,
  SseEvent,
} from "../types";
import { uid } from "../utils/uid";

const SSE_TO_STEP: Record<string, AgentStepType | null> = {
  THINKING: "THINK",
  DECISION: "DECISION",
  TOOL_EXECUTION: "TOOL",
  COMPLETED: "RESULT",
  ERROR: "ERROR",
  STREAM_CHUNK: null,   // handled as streaming text, not a step
};

export class ChatController {
  // ── public reactive state ──────────────────
  private state: ChatState = {
    messages: [],
    steps: [],
    isStreaming: false,
    error: null,
  };

  private listeners = new Set<ControllerListener>();
  private cancelStream: (() => void) | null = null;

  constructor(private readonly client: ChatClient) {}

  // ── Subscriptions ──────────────────────────

  subscribe(listener: ControllerListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state so new subscriber is synced
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot: ChatState = {
      messages: [...this.state.messages],
      steps: [...this.state.steps],
      isStreaming: this.state.isStreaming,
      error: this.state.error,
    };
    this.listeners.forEach((l) => l(snapshot));
  }

  // ── Getters (for non-reactive consumers) ───

  getState(): ChatState {
    return { ...this.state };
  }

  // ── Message helpers ────────────────────────

  private addMessage(msg: Message): void {
    this.state.messages = [...this.state.messages, msg];
  }

  private patchLastAssistantMessage(patch: Partial<Message>): void {
    console.log('🔧 patchLastAssistantMessage called with:', patch);
    const msgs = [...this.state.messages];
    console.log('🔧 Current messages:', msgs.map(m => ({ role: m.role, content: m.content?.slice(0, 50) + '...', isStreaming: m.isStreaming })));
    
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i];
      if (msg && msg.role === "assistant") {
        console.log('🔧 Found assistant message to patch:', { role: msg.role, content: msg.content?.slice(0, 50) + '...', isStreaming: msg.isStreaming });
        msgs[i] = { ...msg, ...patch };
        console.log('🔧 After patch:', { role: msgs[i].role, content: msgs[i].content?.slice(0, 50) + '...', isStreaming: msgs[i].isStreaming });
        this.state.messages = msgs;
        return;
      }
    }
    console.log('🔧 No assistant message found to patch!');
  }

  private addStep(step: Omit<AgentStep, "id" | "timestamp">): void {
    this.state.steps = [
      ...this.state.steps,
      { ...step, id: uid(), timestamp: Date.now() },
    ];
  }

  // ── Core send ──────────────────────────────

  sendMessage(input: string): void {
    const trimmed = input.trim();
    if (!trimmed || this.state.isStreaming) return;

    // Cancel any previous stream
    this.cancelStream?.();
    this.cancelStream = null;

    // Append user message
    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    // Placeholder assistant message for streaming
    const assistantMsg: Message = {
      id: uid(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };

    this.state = {
      ...this.state,
      messages: [...this.state.messages, userMsg, assistantMsg],
      steps: [],          // clear steps for new turn
      isStreaming: true,
      error: null,
    };
    this.notify();

    // Start stream
    console.log('🎬 ChatController: About to call client.stream() with input:', trimmed);
    console.log('🎬 ChatController: Client type:', this.client.constructor.name);
    
    this.cancelStream = this.client.stream(trimmed, (event: SseEvent) => {
      console.log('🎬 ChatController: Received event from client:', event);
      this.handleEvent(event);
    });
  }

  cancel(): void {
    this.cancelStream?.();
    this.cancelStream = null;
    this.patchLastAssistantMessage({ isStreaming: false });
    this.state = { ...this.state, isStreaming: false };
    this.notify();
  }

  clearHistory(): void {
    this.cancelStream?.();
    this.cancelStream = null;
    this.state = {
      messages: [],
      steps: [],
      isStreaming: false,
      error: null,
    };
    this.notify();
  }

  // ── Event → State mapping ──────────────────

  private handleEvent(event: SseEvent): void {
    console.log('🎬 ChatController.handleEvent:', event);
    
    switch (event.type) {
      case "STREAM_CHUNK": {
        // Append incremental text to the in-progress assistant message
        const chunk = event.chunk ?? event.message ?? "";
        this.patchLastAssistantMessage({
          content:
            (this.state.messages.find(
              (m) => m.role === "assistant" && m.isStreaming
            )?.content ?? "") + chunk,
        });
        this.notify();
        break;
      }

      case "COMPLETED": {
        console.log('✅ COMPLETED event details:');
        console.log('  - event.result:', event.result);
        console.log('  - event.message:', event.message);
        console.log('  - current assistant content:', this.state.messages.find(
          (m) => m.role === "assistant" && m.isStreaming
        )?.content);
        
        const finalContent =
          event.result ??
          event.message ??
          this.state.messages.find(
            (m) => m.role === "assistant" && m.isStreaming
          )?.content ??
          "";

        console.log('  - finalContent:', finalContent);

        this.patchLastAssistantMessage({
          content: finalContent,
          isStreaming: false,
        });

        if (event.message && event.message !== finalContent) {
          this.addStep({ type: "RESULT", message: event.message });
        }

        this.state = { ...this.state, isStreaming: false, error: null };
        this.cancelStream = null;
        this.notify();
        break;
      }

      case "ERROR": {
        const errMsg = event.message ?? "An unknown error occurred.";
        this.patchLastAssistantMessage({
          content: errMsg,
          isStreaming: false,
        });
        this.addStep({ type: "ERROR", message: errMsg });
        this.state = {
          ...this.state,
          isStreaming: false,
          error: errMsg,
        };
        this.cancelStream = null;
        this.notify();
        break;
      }

      default: {
        // THINKING / DECISION / TOOL_EXECUTION → agent steps
        const stepType = SSE_TO_STEP[event.type];
        if (stepType) {
          this.addStep({
            type: stepType,
            message: event.message ?? event.type,
            ...(event.metadata && { metadata: event.metadata }),
          });
          this.notify();
        }
        break;
      }
    }
  }
}