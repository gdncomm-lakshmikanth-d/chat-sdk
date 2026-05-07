// ─────────────────────────────────────────────
//  @opspilot/chat-react  —  useChatController
// ─────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import {
  ChatClient,
  ChatController,
  ChatState,
} from "@opspilot/chat-core";

export interface UseChatControllerReturn extends ChatState {
  sendMessage: (input: string) => void;
  cancel: () => void;
  clearHistory: () => void;
  controller: ChatController;
}

/**
 * React hook that wires a ChatController to React state.
 * Re-renders happen only when state actually changes.
 */
export function useChatController(
  client: ChatClient
): UseChatControllerReturn {
  // Keep controller stable across renders, but recreate when client changes
  const controllerRef = useRef<ChatController | null>(null);
  const clientRef = useRef<ChatClient | null>(null);
  
  // Check if client has changed
  if (!controllerRef.current || clientRef.current !== client) {
    controllerRef.current = new ChatController(client);
    clientRef.current = client;
  }
  
  const controller = controllerRef.current;

  const [state, setState] = useState<ChatState>(controller.getState());

  useEffect(() => {
    const unsub = controller.subscribe((nextState) => {
      console.log('🔄 useChatController state update:', {
        messagesCount: nextState.messages.length,
        stepsCount: nextState.steps.length,
        isStreaming: nextState.isStreaming,
        messages: nextState.messages.map(m => ({ 
          role: m.role, 
          content: m.content?.slice(0, 50) + '...', 
          isStreaming: m.isStreaming 
        }))
      });
      setState(nextState);
    });
    return unsub;
  }, [controller]);

  return {
    ...state,
    sendMessage: (input) => controller.sendMessage(input),
    cancel: () => controller.cancel(),
    clearHistory: () => controller.clearHistory(),
    controller,
  };
}