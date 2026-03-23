/**
 * SSE (Server-Sent Events) Event
 */
export interface SSEEvent {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
  timestamp: number;
}

/**
 * SSE Parser options
 */
export interface SSEParseOptions {
  ignoreComments?: boolean;
  trimData?: boolean;
}

/**
 * SSE Stream handler options
 */
export interface SSEStreamHandlerOptions {
  onData?: (event: SSEEvent) => void;
  onProgress?: (events: SSEEvent[]) => void;
  onComplete?: (events: SSEEvent[]) => void;
  onError?: (error: Error) => void;
}

/**
 * SSE Console entry for display
 */
export interface SSEConsoleEntry {
  id: string;
  event: SSEEvent;
  parsed?: any;
  timestamp: number;
}
