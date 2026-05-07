// ─────────────────────────────────────────────
//  @opspilot/chat-react  —  useChatScroll Hook
// ─────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";

export function useChatScroll(dependencies: any[]) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);

  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const THRESHOLD = 80; // px from bottom
  const SCROLL_THROTTLE = 50; // ms

  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;

    return (
      el.scrollHeight - el.scrollTop - el.clientHeight < THRESHOLD
    );
  }, []);

  // Throttled scroll handler to prevent excessive updates
  const handleScroll = useCallback(() => {
    const now = Date.now();
    const timeSinceLastScroll = now - lastScrollTimeRef.current;

    if (timeSinceLastScroll < SCROLL_THROTTLE) {
      // Throttle: schedule for later
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        handleScrollImmediate();
      }, SCROLL_THROTTLE - timeSinceLastScroll);
      return;
    }

    handleScrollImmediate();
  }, []);

  const handleScrollImmediate = useCallback(() => {
    if (!containerRef.current) return;

    lastScrollTimeRef.current = Date.now();
    const nearBottom = isNearBottom();
    
    setIsAutoScroll(nearBottom);

    // Clear new message indicator if user scrolls back to bottom
    if (nearBottom) {
      setHasNewMessages(false);
    }
  }, [isNearBottom]);

  // Scroll to bottom function
  const scrollToBottom = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });

    // Reset state after manual scroll to bottom
    setHasNewMessages(false);
    setIsAutoScroll(true);
  }, []);

  // Scroll to show new message at top of viewport (like first message)
  const scrollToNewMessage = useCallback((lastMessageRef?: React.RefObject<HTMLDivElement>, smooth = true) => {
    const el = containerRef.current;
    if (!el || !lastMessageRef?.current) return;

    // Use setTimeout to ensure DOM is fully updated
    setTimeout(() => {
      const lastMessage = lastMessageRef.current;
      if (!lastMessage) return;

      // Get the message position and container info
      const messageTop = lastMessage.offsetTop;
      const containerPadding = 20; // Account for container padding
      
      // Calculate scroll position to put the message at the very top
      // Just like how the first message appears naturally
      const targetScrollTop = messageTop - containerPadding;
      
      el.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: smooth ? "smooth" : "auto",
      });

      setHasNewMessages(false);
      setIsAutoScroll(true);
    }, 100); // Longer delay to ensure DOM is ready
  }, []);

  // Handle content updates with intelligent auto-scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Only process if we have an active trigger (streaming)
    const [trigger] = dependencies;
    if (!trigger) return;

    // Batch scroll updates to prevent jank during streaming
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (isAutoScroll) {
        // Auto-scroll during streaming
        scrollToBottom(false);
      } else {
        // User is scrolled up during streaming - show new message indicator
        setHasNewMessages(true);
      }
    }, 16); // ~60fps batching

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, dependencies);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Reset to auto-scroll mode (useful when new conversation starts)
  const resetToAutoScroll = useCallback(() => {
    setIsAutoScroll(true);
    setHasNewMessages(false);
  }, []);

  return {
    containerRef,
    handleScroll,
    scrollToBottom,
    scrollToNewMessage,
    resetToAutoScroll,
    hasNewMessages,
    isAutoScroll,
  };
}