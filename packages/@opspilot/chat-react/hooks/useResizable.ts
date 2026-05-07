// ─────────────────────────────────────────────
//  @opspilot/chat-react  —  useResizable Hook
// ─────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseResizableOptions {
  /** Initial width (number in px or string like "25%") */
  defaultWidth: number | string;
  /** Minimum width in pixels */
  minWidth: number;
  /** Maximum width (number in px or string like "50%") */
  maxWidth: number | string;
  /** Optional localStorage key to persist width */
  persistKey?: string;
}

export interface UseResizableReturn {
  /** Current width in pixels */
  width: number;
  /** Mouse down handler for drag handle */
  onDragHandleMouseDown: (e: React.MouseEvent) => void;
}

function parseWidth(width: number | string, containerWidth: number): number {
  if (typeof width === "number") return width;
  if (typeof width === "string" && width.endsWith("%")) {
    const percentage = parseFloat(width);
    return (containerWidth * percentage) / 100;
  }
  return parseFloat(width.toString()) || 400;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Hook for making panels resizable with mouse drag.
 * Provides mouse-drag resize with clamp(), localStorage persistence, 
 * and clean AbortController-style cleanup.
 */
export function useResizable({
  defaultWidth,
  minWidth,
  maxWidth,
  persistKey = "opspilot-panel-width",
}: UseResizableOptions): UseResizableReturn {
  const containerWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  
  // Parse default width
  const initialWidth = parseWidth(defaultWidth, containerWidth);
  
  // Load from localStorage if available
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return initialWidth;
    
    const stored = localStorage.getItem(persistKey);
    if (stored) {
      const parsedStored = parseInt(stored, 10);
      if (!isNaN(parsedStored)) {
        const maxWidthPx = parseWidth(maxWidth, containerWidth);
        return clamp(parsedStored, minWidth, maxWidthPx);
      }
    }
    return initialWidth;
  });

  const isDraggingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Calculate max width dynamically
  const maxWidthPx = parseWidth(maxWidth, containerWidth);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const newWidth = containerWidth - e.clientX;
      const clampedWidth = clamp(newWidth, minWidth, maxWidthPx);
      
      setWidth(clampedWidth);
      
      // Persist to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(persistKey, clampedWidth.toString());
      }
    },
    [containerWidth, minWidth, maxWidthPx, persistKey]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    
    // Clean up event listeners via AbortController
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const onDragHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      
      // Set cursor for entire document during drag
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      
      // Create new AbortController for this drag session
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;
      
      // Add event listeners with AbortController
      document.addEventListener("mousemove", handleMouseMove, { signal });
      document.addEventListener("mouseup", handleMouseUp, { signal });
    },
    [handleMouseMove, handleMouseUp]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newContainerWidth = window.innerWidth;
      const newMaxWidthPx = parseWidth(maxWidth, newContainerWidth);
      
      setWidth((prevWidth) => clamp(prevWidth, minWidth, newMaxWidthPx));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [maxWidth, minWidth]);

  return {
    width,
    onDragHandleMouseDown,
  };
}