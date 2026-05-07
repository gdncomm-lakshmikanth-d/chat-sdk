# OpsPilot Chat SDK

> **Pure TypeScript chat core** + **Premium React UI components** for building AI agent interfaces with real-time streaming, execution steps, and professional UX.

🎯 **Features:**
- ✨ **Real Agent API Integration** - Connect to your streaming chat APIs
- 🎨 **Beautiful Message Formatting** - Markdown-like rendering with colors and styling  
- ⌨️ **ChatGPT-like Typing Effect** - Character-by-character streaming with acceleration
- 🔄 **Agent Steps Visualization** - Show thinking, decision, and tool execution steps
- 📱 **Professional UI** - Resizable panels, smooth animations, modern design
- 🚀 **Easy Integration** - Drop-in React component with TypeScript support

Click "Launch Live Demo" in the widget above to see the full panel in action — real SSE events, draggable resize, tabs, streaming cursor, and execution steps all firing live.

## Packages

### @opspilot/chat-core — Pure TypeScript, zero UI deps

| File | What it does |
|------|--------------|
| `types/index.ts` | All domain types: Message, AgentStep, SseEvent, ChatClient interface, ChatState |
| `client/SseChatClient.ts` | fetch()-based SSE transport with an event normalisation map. Returns a cancel function. Handles partial buffers correctly. |
| `client/MockChatClient.ts` | Replay a scripted event sequence with configurable delay — ideal for Storybook and unit tests |
| `controller/ChatController.ts` | Central state machine. Maps raw SSE events → messages[] + steps[]. Subscriber pattern (no React). Handles streaming append, cancel, clear. |

### @opspilot/chat-react — Premium UI layer

| File | What it does |
|------|--------------|
| `hooks/useChatController.ts` | Binds ChatController to React state with a single useEffect subscriber — zero unnecessary re-renders |
| `hooks/useResizable.ts` | Mouse-drag resize with clamp(), localStorage persistence, and clean AbortController-style cleanup |
| `components/OpsPilotChat.tsx` | Full panel: floating FAB → slide-in panel, drag handle, Chat/Steps tabs, streaming bubble with cursor, typing indicator, auto-grow textarea, stop button |

## Key architecture decisions

- **ChatClient is an interface** — swap SSE for WebSocket, GraphQL subscriptions, or Axios in one line
- **ChatController has zero React imports** — works identically in Vue, Angular, or a plain `<script>` tag
- **Event normalisation map** in SseChatClient means your backend can send THINK, THINKING, or thinking — all map correctly
- **Steps are cleared per turn** so the Steps tab always shows the current agent's reasoning, not stale history

## Installation

```bash
# Install both packages
pnpm add @opspilot/chat-core @opspilot/chat-react

# Or install just the core (for non-React projects)
pnpm add @opspilot/chat-core
```

## Quick Start

### 1. Basic React Usage

```tsx
import { createChatClient } from "@opspilot/chat-core";
import { OpsPilotChat } from "@opspilot/chat-react";

// Connect to your AI backend
const client = createChatClient({
  baseUrl: "https://api.example.com",
  headers: { "Authorization": "Bearer your-token" }
});

export function App() {
  return (
    <div>
      {/* Your app content */}
      <OpsPilotChat 
        client={client}
        title="AI Assistant"
        showSteps={true}
        defaultWidth="30%"
      />
    </div>
  );
}
```

### 2. Framework-Agnostic (Core Only)

```ts
import { createChatClient, ChatController } from "@opspilot/chat-core";

const client = createChatClient({ baseUrl: "https://api.example.com" });
const controller = new ChatController(client);

// Subscribe to state changes
controller.subscribe((state) => {
  console.log("Messages:", state.messages);
  console.log("Agent steps:", state.steps);
  console.log("Streaming:", state.isStreaming);
});

// Send a message
controller.sendMessage("What's the status of AWB123?");
```

### 3. Custom Transport

```ts
import { ChatClient, SseEvent } from "@opspilot/chat-core";

class WebSocketChatClient implements ChatClient {
  stream(input: string, onEvent: (event: SseEvent) => void): () => void {
    const ws = new WebSocket("wss://api.example.com/chat");
    ws.onmessage = (msg) => onEvent(JSON.parse(msg.data));
    ws.send(JSON.stringify({ message: input }));
    return () => ws.close();
  }
}

const customClient = new WebSocketChatClient();
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 2. Build Packages

```bash
# Build both @opspilot/chat-core and @opspilot/chat-react
pnpm build
```

### 3. Run the Example App

```bash
# Start the React example with live demo
pnpm example
```

This will start a Vite dev server at `http://localhost:5173` with a fully functional chat interface using the MockChatClient.

## 🧪 Testing

### Run All Tests

```bash
# Run tests for both packages
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

### Test Individual Packages

```bash
# Test just the core package
pnpm --filter @opspilot/chat-core test

# Test just the React package  
pnpm --filter @opspilot/chat-react test
```

## 🔌 Agent API Integration

Connect to your streaming Agent API in just a few lines:

```typescript
import { createAgentChatClient } from '@opspilot/chat-core';

const client = createAgentChatClient({
  baseUrl: process.env.AGENT_API_BASE_URL || "http://localhost:9095",
  team: process.env.AGENT_API_TEAM || "your-team",
  headers: {
    "Authorization": `Bearer ${process.env.AGENT_API_TOKEN}`
  }
});

<OpsPilotChat client={client} />
```

**Supported API format:**
```
event:THINKING
data:{"type":"THINKING","message":"🤔 Analyzing..."}

event:COMPLETED  
data:{"type":"COMPLETED","message":"✅ **Results**\n\n**📋 Status:** Complete"}
```

**Features:**
- ⌨️ **ChatGPT-like typing effect** with acceleration
- 🎨 **Beautiful message formatting** with markdown-like styling  
- 🔄 **Agent steps visualization** (THINKING → DECISION → TOOL_EXECUTION)
- 📱 **Responsive design** with dark theme

## 🛠️ Development

### Build in Watch Mode

```bash
# Build packages in watch mode (rebuilds on file changes)
pnpm dev
```

### Type Checking

```bash
# Check types across all packages
pnpm typecheck
```

### Package Structure

```
packages/
├── @opspilot/chat-core/     # Pure TypeScript chat engine
│   ├── types/               # Domain types and interfaces
│   ├── client/              # SSE and Mock clients
│   ├── controller/          # State management
│   ├── utils/               # Utilities (uid generator)
│   └── __tests__/           # Unit tests
│
├── @opspilot/chat-react/    # React UI components
│   ├── hooks/               # React hooks
│   ├── components/          # Chat UI components
│   └── __tests__/           # Component tests
│
examples/
└── basic-react/             # Live demo application
```

## 🎯 Quick Test Commands

```bash
# Install and run everything
pnpm install && pnpm build && pnpm example

# Run tests while developing
pnpm test --watch

# Build and test everything
pnpm build && pnpm test

# Check if everything is working
pnpm typecheck && pnpm test
```

## License

MIT © OpsPilot Team