// ─────────────────────────────────────────────
//  @opspilot/chat-core  —  UID Utility
// ─────────────────────────────────────────────

/**
 * Generate a simple unique ID for messages and steps.
 * Uses crypto.randomUUID() if available, falls back to timestamp + random.
 */
export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}