// ─────────────────────────────────────────────
//  @opspilot/chat-react  —  OpsPilotChat
//  Premium AI Chat Panel Component
// ─────────────────────────────────────────────

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ChatClient } from "@opspilot/chat-core";
import { useChatController } from "../hooks/useChatController";
import { useResizable } from "../hooks/useResizable";
import { useChatScroll } from "../hooks/useChatScroll";

// ── Types ──────────────────────────────────────

export interface OpsPilotChatProps {
  client: ChatClient;
  title?: string;
  defaultWidth?: number | string;
  minWidth?: number;
  maxWidth?: number | string;
  showSteps?: boolean;
  placeholder?: string;
  /** Override accent colour (CSS colour string) */
  accentColor?: string;
  /** Initial open state */
  defaultOpen?: boolean;
}

// ── Step meta ──────────────────────────────────

const STEP_META = {
  THINK:    { icon: "🤔", label: "Thinking",       color: "#7c6af7" },
  DECISION: { icon: "🧠", label: "Decision",       color: "#38bdf8" },
  TOOL:     { icon: "⚡", label: "Tool Execution",  color: "#f59e0b" },
  RESULT:   { icon: "📊", label: "Result",         color: "#34d399" },
  ERROR:    { icon: "❌", label: "Error",           color: "#f87171" },
} as const;

// ── Inline styles (no external CSS deps) ───────

const css = {
  // ── Floating button ──
  fab: {
    position: "fixed" as const,
    bottom: 28,
    right: 28,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #7c6af7 0%, #38bdf8 100%)",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 8px 32px rgba(124,106,247,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    transition: "transform 200ms ease, box-shadow 200ms ease",
    outline: "none",
    color: "#fff",
    fontSize: 24,
  } as React.CSSProperties,

  // ── Overlay backdrop ──
  backdrop: {
    position: "fixed" as const,
    inset: 0,
    background: "transparent", // No background overlay
    zIndex: 9998,
    animation: "opFadeIn 200ms ease forwards",
  } as React.CSSProperties,

  // ── Side panel ──
  panel: (width: number): React.CSSProperties => ({
    position: "fixed" as const,
    top: 0,
    right: 0,
    bottom: 0,
    width,
    background: "#0d1117",
    borderLeft: "1px solid rgba(255,255,255,0.07)",
    boxShadow: "-8px 0 48px rgba(0,0,0,0.6)",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
    animation: "opSlideIn 250ms cubic-bezier(0.22,1,0.36,1) forwards",
    overflow: "hidden",
  }),

  // ── Drag handle ──
  dragHandle: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    cursor: "col-resize",
    zIndex: 1,
    background: "transparent",
    transition: "background 150ms",
  } as React.CSSProperties,

  // ── Header ──
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(255,255,255,0.02)",
    flexShrink: 0,
  } as React.CSSProperties,

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as React.CSSProperties,

  headerTitle: {
    color: "#f0f6fc",
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    margin: 0,
  } as React.CSSProperties,

  statusDot: (active: boolean): React.CSSProperties => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: active ? "#34d399" : "#4b5563",
    boxShadow: active ? "0 0 8px #34d39999" : "none",
    transition: "all 300ms",
  }),

  headerActions: {
    display: "flex",
    gap: 4,
  } as React.CSSProperties,

  iconBtn: {
    background: "transparent",
    border: "none",
    color: "#6b7280",
    cursor: "pointer",
    padding: "6px 8px",
    borderRadius: 8,
    fontSize: 16,
    lineHeight: 1,
    transition: "background 150ms, color 150ms",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  // ── Tabs ──
  tabs: {
    display: "flex",
    padding: "0 16px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    gap: 4,
    flexShrink: 0,
    background: "rgba(0,0,0,0.15)",
  } as React.CSSProperties,

  tab: (active: boolean): React.CSSProperties => ({
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? "#f0f6fc" : "#6b7280",
    background: "transparent",
    border: "none",
    borderBottom: active ? "2px solid #7c6af7" : "2px solid transparent",
    cursor: "pointer",
    transition: "color 150ms, border-color 150ms",
    outline: "none",
    letterSpacing: "0.01em",
  }),

  // ── Messages body ──
  body: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
    scrollbarWidth: "thin" as const,
    scrollbarColor: "#2d333b transparent",
    minHeight: "100%", // Ensure there's always room for spacing
  } as React.CSSProperties,

  // ── Messages ──
  messageBubble: (role: "user" | "assistant"): React.CSSProperties => ({
    maxWidth: "88%",
    alignSelf: role === "user" ? "flex-end" : "flex-start",
    padding: "11px 15px",
    borderRadius: role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
    background: role === "user"
      ? "linear-gradient(135deg, #7c6af7 0%, #5b4fd4 100%)"
      : "rgba(255,255,255,0.06)",
    color: "#e6edf3",
    fontSize: 14,
    lineHeight: 1.6,
    border: role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none",
    wordBreak: "break-word" as const,
    boxShadow: role === "user"
      ? "0 4px 20px rgba(124,106,247,0.3)"
      : "0 2px 8px rgba(0,0,0,0.2)",
  }),

  // ── Typing indicator ──
  typingDot: (delay: number): React.CSSProperties => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#7c6af7",
    display: "inline-block",
    animation: `opBounce 1.2s ${delay}ms infinite ease-in-out`,
  }),

  // ── Steps panel ──
  stepsBody: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    scrollbarWidth: "thin" as const,
    scrollbarColor: "#2d333b transparent",
  } as React.CSSProperties,

  stepCard: (color: string): React.CSSProperties => ({
    padding: "10px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${color}33`,
    borderLeft: `3px solid ${color}`,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    animation: "opFadeIn 200ms ease forwards",
  }),

  stepHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  } as React.CSSProperties,

  stepLabel: (color: string): React.CSSProperties => ({
    fontSize: 11,
    fontWeight: 700,
    color,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  }),

  stepMessage: {
    fontSize: 13,
    color: "#8b949e",
    lineHeight: 1.5,
  } as React.CSSProperties,

  // ── Empty states ──
  empty: {
    margin: "auto",
    textAlign: "center" as const,
    color: "#4b5563",
  } as React.CSSProperties,

  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
    display: "block",
  } as React.CSSProperties,

  emptyText: {
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 220,
  } as React.CSSProperties,

  // ── Input bar ──
  inputBar: {
    padding: "12px 16px",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
    background: "rgba(0,0,0,0.2)",
    flexShrink: 0,
  } as React.CSSProperties,

  textarea: {
    flex: 1,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "10px 14px",
    color: "#e6edf3",
    fontSize: 14,
    lineHeight: 1.5,
    resize: "none" as const,
    outline: "none",
    fontFamily: "inherit",
    maxHeight: 120,
    overflowY: "auto" as const,
    transition: "border-color 200ms",
    scrollbarWidth: "thin" as const,
    scrollbarColor: "#2d333b transparent",
  } as React.CSSProperties,

  sendBtn: (disabled: boolean): React.CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: 10,
    background: disabled
      ? "rgba(255,255,255,0.06)"
      : "linear-gradient(135deg, #7c6af7 0%, #38bdf8 100%)",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    color: disabled ? "#4b5563" : "#fff",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 200ms, transform 100ms",
    boxShadow: disabled ? "none" : "0 4px 16px rgba(124,106,247,0.4)",
  }),

  // ── Chat container with relative positioning ──
  chatContainer: {
    position: "relative" as const,
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  } as React.CSSProperties,

  // ── Scroll to bottom button ──
  scrollToBottomBtn: {
    position: "absolute" as const,
    bottom: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    background: "rgba(13,17,23,0.95)",
    border: "1px solid rgba(124,106,247,0.3)",
    cursor: "pointer",
    color: "#7c6af7",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
    transition: "all 200ms ease",
    zIndex: 10,
    backdropFilter: "blur(8px)",
  } as React.CSSProperties,
};

// ── Keyframes injection ─────────────────────────

function injectKeyframes() {
  if (document.getElementById("opspilot-keyframes")) return;
  const style = document.createElement("style");
  style.id = "opspilot-keyframes";
  style.textContent = `
    @keyframes opFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes opSlideIn {
      from { transform: translateX(100%); opacity: 0.6; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes opBounce {
      0%, 80%, 100% { transform: translateY(0); }
      40%           { transform: translateY(-5px); }
    }
    @keyframes opPulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.5; }
    }
    .op-icon-btn:hover {
      background: rgba(255,255,255,0.08) !important;
      color: #e6edf3 !important;
    }
    .op-textarea:focus {
      border-color: rgba(124,106,247,0.5) !important;
      box-shadow: 0 0 0 3px rgba(124,106,247,0.1) !important;
    }
    .op-send-btn:hover:not(:disabled) {
      transform: scale(1.04) !important;
    }
    .op-drag-handle:hover {
      background: rgba(124,106,247,0.25) !important;
    }
    .op-fab:hover {
      transform: scale(1.08) !important;
      box-shadow: 0 12px 40px rgba(124,106,247,0.55) !important;
    }
    .op-scroll-btn:hover {
      background: rgba(13,17,23,1) !important;
      border-color: rgba(124,106,247,0.6) !important;
      color: #38bdf8 !important;
      transform: scale(1.05) !important;
    }
  `;
  document.head.appendChild(style);
}

// ── Sub-components ──────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ ...css.messageBubble("assistant"), padding: "14px 18px" }}>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        {[0, 160, 320].map((delay) => (
          <span key={delay} style={css.typingDot(delay)} />
        ))}
      </div>
    </div>
  );
}

// Enhanced markdown-like formatter for assistant messages
function formatMessage(content: string): React.ReactNode[] {
  if (!content) return [];
  
  // Pre-process content to clean up file paths
  console.log('🔍 Original content contains file paths:', content.includes('📁 File:'));
  
  const originalContent = content;
  content = content.replace(/📁 File: `([^`]+)`/g, (match, fullPath) => {
    const filename = fullPath.split('/').pop() || fullPath;
    console.log('🎯 Processed file path (backticks):', fullPath, '→', filename);
    return `📁 File: \`${filename}\``;
  });
  
  content = content.replace(/📁 File: ([^\n]+)/g, (match, fullPath) => {
    const filename = fullPath.split('/').pop() || fullPath;
    console.log('🎯 Processed file path (no backticks):', fullPath, '→', filename);
    return `📁 File: ${filename}`;
  });
  
  if (originalContent !== content) {
    console.log('✅ File paths were processed and shortened');
  }
  
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';
  
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    
    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <div key={`code-${index}`} style={{
            background: '#0d1117',
            border: '1px solid #21262d',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px',
            overflow: 'auto'
          }}>
            <code style={{
              fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Courier New', monospace",
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#e6edf3',
              whiteSpace: 'pre'
            }}>
              {codeBlockContent.join('\n')}
            </code>
          </div>
        );
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLang = '';
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    let formattedLine: React.ReactNode = line;
    
    // Handle bold text **text**
    if (line.includes('**')) {
      const parts = line.split(/(\*\*.*?\*\*)/);
      formattedLine = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: '#e6edf3', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    }
    
    // Handle inline code `code`
    if (typeof formattedLine === 'string' && formattedLine.includes('`')) {
      const parts = formattedLine.split(/(`.*?`)/);
      formattedLine = parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} style={{
              background: 'rgba(110, 118, 129, 0.4)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: "'SF Mono', monospace",
              fontSize: '12px',
              color: '#e6edf3'
            }}>
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });
    }
    
    // Handle different line types
    if (line.startsWith('✅')) {
      elements.push(
        <div key={index} style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: '#34d399', 
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {formattedLine}
        </div>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <div key={index} style={{ 
          fontSize: '18px',
          fontWeight: 700,
          color: '#e6edf3',
          marginTop: '20px',
          marginBottom: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '8px'
        }}>
          {formattedLine.slice(4)}
        </div>
      );
    } else if (line.startsWith('📁 File:') || line.startsWith('📦 Repository:')) {
      // Extract just the filename from the full path
      let displayText = formattedLine;
      if (typeof displayText === 'string' && line.startsWith('📁 File:')) {
        const fullPath = line.substring(9).trim(); // Remove "📁 File: "
        const fileName = fullPath.split('/').pop() || fullPath;
        displayText = `📁 File: ${fileName}`;
      }
      
      elements.push(
        <div key={index} style={{ 
          fontSize: '13px',
          color: '#8b949e',
          fontFamily: "'SF Mono', monospace",
          marginBottom: '4px',
          padding: '4px 8px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '4px'
        }}>
          {displayText}
        </div>
      );
    } else if (line.startsWith('💻 Code:')) {
      elements.push(
        <div key={index} style={{ 
          fontSize: '14px',
          color: '#58a6ff',
          fontWeight: 600,
          marginTop: '8px',
          marginBottom: '4px'
        }}>
          {formattedLine}
        </div>
      );
    } else if (line.startsWith('**📋') || line.startsWith('**💡') || line.startsWith('🔍')) {
      elements.push(
        <div key={index} style={{ 
          fontSize: '14px',
          color: '#e6edf3',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          background: 'rgba(255,255,255,0.03)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {formattedLine}
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={index} style={{ height: '8px' }} />);
    } else {
      elements.push(
        <div key={index} style={{ 
          fontSize: '14px',
          color: '#e6edf3',
          lineHeight: '1.6',
          marginBottom: '4px'
        }}>
          {formattedLine}
        </div>
      );
    }
  }
  
  return elements;
}

const MessageBubble = React.forwardRef<
  HTMLDivElement,
  { msg: import("@opspilot/chat-core").Message }
>(({ msg }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: msg.role === "user" ? "flex-end" : "flex-start",
        animation: "opFadeIn 200ms ease forwards",
      }}
    >
      {msg.isStreaming && !msg.content ? (
        <TypingIndicator />
      ) : (
        <div style={css.messageBubble(msg.role)}>
          {msg.role === "assistant" ? (
            <div style={{ whiteSpace: "pre-wrap" }}>
              {formatMessage(msg.content)}
            </div>
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
          )}
          {msg.isStreaming && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: "1em",
                background: "#7c6af7",
                marginLeft: 2,
                animation: "opPulse 800ms infinite",
                borderRadius: 2,
                verticalAlign: "text-bottom",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
});

function StepCard({ step }: { step: import("@opspilot/chat-core").AgentStep }) {
  const meta = STEP_META[step.type];
  return (
    <div style={css.stepCard(meta.color)}>
      <div style={css.stepHeader}>
        <span style={{ fontSize: 14 }}>{meta.icon}</span>
        <span style={css.stepLabel(meta.color)}>{meta.label}</span>
      </div>
      <p style={css.stepMessage}>{step.message}</p>
      {step.metadata && (
        <pre
          style={{
            fontSize: 11,
            color: "#4b5563",
            margin: 0,
            overflowX: "auto",
            background: "rgba(0,0,0,0.2)",
            padding: "6px 10px",
            borderRadius: 6,
          }}
        >
          {JSON.stringify(step.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────

export function OpsPilotChat({
  client,
  title = "AI Assistant",
  defaultWidth = "25%",
  minWidth = 320,
  maxWidth = "50%",
  showSteps = true,
  placeholder = "Ask anything…",
  defaultOpen = false,
}: OpsPilotChatProps) {
  useEffect(() => { injectKeyframes(); }, []);

  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "steps">("chat");
  const [input, setInput] = useState("");

  const { messages, steps, isStreaming, sendMessage, cancel } =
    useChatController(client);

  // Debug: Log what OpsPilotChat is rendering
  console.log('🎨 OpsPilotChat render:', {
    messagesCount: messages.length,
    stepsCount: steps.length,
    isStreaming,
    messages: messages.map(m => ({ 
      role: m.role, 
      content: m.content?.slice(0, 50) + (m.content?.length > 50 ? '...' : ''), 
      isStreaming: m.isStreaming 
    }))
  });

  const { width, onDragHandleMouseDown } = useResizable({
    defaultWidth,
    minWidth,
    maxWidth,
  });

  const { containerRef, handleScroll, scrollToBottom, scrollToNewMessage, resetToAutoScroll, hasNewMessages } = 
    useChatScroll([isStreaming ? Date.now() : 0]); // Only update during streaming

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);


  // Auto-resize textarea
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const ta = e.target;
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    },
    []
  );

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    
    // Send the message
    sendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setActiveTab("chat");
    
    // Reset scroll state for new message
    resetToAutoScroll();
    
  }, [input, isStreaming, sendMessage, resetToAutoScroll, scrollToNewMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === "Escape") setOpen(false);
    },
    [handleSend]
  );

  // Switch to steps tab automatically when steps arrive
  useEffect(() => {
    if (steps.length > 0 && showSteps && activeTab === "chat" && isStreaming) {
      // Keep on chat — show steps only when user manually switches
    }
  }, [steps, showSteps, activeTab, isStreaming]);

  // Auto-scroll to new user messages when they are added
  useEffect(() => {
    const lastUserIndex = [...messages].map(m => m.role).lastIndexOf("user");
    if (lastUserIndex >= 0) {
      // Wait for DOM to update, then scroll to show the new user message
      setTimeout(() => {
        scrollToNewMessage(lastUserMessageRef, true);
      }, 200);
    }
  }, [messages.length, scrollToNewMessage]); // Trigger when messages array length changes

  const panelWidth = expanded ? window.innerWidth : width;

  return (
    <>
      {/* ── Floating Action Button ── */}
      {!open && (
        <button
          className="op-fab"
          style={css.fab}
          onClick={() => setOpen(true)}
          aria-label="Open AI Assistant"
          title="Open AI Assistant"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* ── Backdrop ── */}
      {open && (
        <div
          style={css.backdrop}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Side Panel ── */}
      {open && (
        <div
          style={css.panel(panelWidth)}
          role="dialog"
          aria-label={title}
          aria-modal="true"
        >
          {/* Drag handle */}
          {!expanded && (
            <div
              className="op-drag-handle"
              style={css.dragHandle}
              onMouseDown={onDragHandleMouseDown}
              title="Drag to resize"
            />
          )}

          {/* ── Header ── */}
          <div style={css.header}>
            <div style={css.headerLeft}>
              <div style={css.statusDot(isStreaming)} title={isStreaming ? "Processing…" : "Ready"} />
              <h2 style={css.headerTitle}>{title}</h2>
            </div>
            <div style={css.headerActions}>
              {isStreaming && (
                <button
                  className="op-icon-btn"
                  style={css.iconBtn}
                  onClick={cancel}
                  title="Stop generation"
                  aria-label="Stop generation"
                >
                  ⏹
                </button>
              )}
              <button
                className="op-icon-btn"
                style={css.iconBtn}
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? "Restore" : "Expand"}
                aria-label={expanded ? "Restore panel" : "Expand panel"}
              >
                {expanded ? "⊠" : "⊡"}
              </button>
              <button
                className="op-icon-btn"
                style={css.iconBtn}
                onClick={() => setOpen(false)}
                title="Close"
                aria-label="Close assistant"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          {showSteps && (
            <div style={css.tabs} role="tablist">
              {(["chat", "steps"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={activeTab === t}
                  style={css.tab(activeTab === t)}
                  onClick={() => setActiveTab(t)}
                >
                  {t === "chat" ? "💬 Chat" : `⚙️ Steps${steps.length ? ` (${steps.length})` : ""}`}
                </button>
              ))}
            </div>
          )}

          {/* ── Chat Tab ── */}
          {activeTab === "chat" && (
            <div style={css.chatContainer}>
              <div 
                ref={containerRef} 
                style={css.body} 
                role="log" 
                aria-live="polite" 
                aria-label="Chat messages"
                onScroll={handleScroll}
              >
                {messages.length === 0 ? (
                  <div style={css.empty}>
                    <span style={css.emptyIcon}>✨</span>
                    <p style={css.emptyText}>
                      Ask me anything about your TMS operations, shipments, or system health.
                    </p>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const lastUserIndex = [...messages]
                        .map(m => m.role)
                        .lastIndexOf("user");
                      
                      return messages.map((msg, index) => (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          ref={index === lastUserIndex ? lastUserMessageRef : null}
                        />
                      ));
                    })()}
                    
                    {/* Flexbox spacer - always pushes content to top, grows to fill remaining space */}
                    <div style={{ flex: 1, minHeight: 200 }} />
                  </>
                )}
              </div>
              
              {/* Scroll to bottom button - positioned outside scroll container */}
              {hasNewMessages && (
                <button
                  className="op-scroll-btn"
                  style={css.scrollToBottomBtn}
                  onClick={() => scrollToBottom(true)}
                  title="Scroll to bottom"
                  aria-label="Scroll to bottom"
                >
                  ↓
                </button>
              )}
            </div>
          )}

          {/* ── Steps Tab ── */}
          {activeTab === "steps" && showSteps && (
            <div style={css.chatContainer}>
              <div style={css.stepsBody} role="log" aria-label="Agent execution steps">
                {steps.length === 0 ? (
                  <div style={css.empty}>
                    <span style={css.emptyIcon}>🔍</span>
                    <p style={css.emptyText}>
                      Agent execution steps will appear here during processing.
                    </p>
                  </div>
                ) : (
                  steps.map((step) => (
                    <StepCard key={step.id} step={step} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Input Bar ── */}
          <div style={css.inputBar}>
            <textarea
              ref={textareaRef}
              className="op-textarea"
              style={css.textarea}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={false}
              aria-label="Message input"
            />
            <button
              className="op-send-btn"
              style={css.sendBtn(!input.trim() || isStreaming)}
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
              title="Send (Enter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}