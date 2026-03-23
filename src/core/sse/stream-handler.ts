import { SSEParser } from './parser';
import type {
  SSEEvent,
  SSEStreamHandlerOptions,
  SSEConsoleEntry,
} from '../../types/sse';

/**
 * SSE Stream Handler for handling real-time SSE streams
 */
export class SSEStreamHandler {
  private parser: SSEParser;
  private options: Required<SSEStreamHandlerOptions>;
  private eventQueue: SSEEvent[] = [];
  private consoleEntries: SSEConsoleEntry[] = [];

  constructor(options: SSEStreamHandlerOptions = {}) {
    this.parser = new SSEParser();
    this.options = {
      onData: () => {},
      onProgress: () => {},
      onComplete: () => {},
      onError: () => {},
      ...options,
    };
  }

  /**
   * Handle a Response object with SSE content
   */
  async handleStream(response: Response, signal?: AbortSignal): Promise<SSEEvent[]> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No body reader available for SSE stream');
    }

    const decoder = new TextDecoder();
    let chunkCount = 0;
    let eventCount = 0;

    console.log('[SSEStreamHandler] Starting stream handling');

    try {
      while (true) {
        // 检查是否已取消
        if (signal?.aborted) {
          console.log('[SSE] Stream aborted by signal');
          return this.eventQueue;
        }

        const { done, value } = await reader.read();

        if (done) {
          console.log('[SSEStreamHandler] Stream complete. Total chunks:', chunkCount, 'Total events:', eventCount);
          // Stream complete
          this.options.onComplete(this.eventQueue);
          return this.eventQueue;
        }

        chunkCount++;
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        console.log('[SSEStreamHandler] Received chunk', chunkCount, 'size:', chunk.length, 'bytes');

        // Parse SSE events from chunk
        const events = this.parser.parse(chunk);
        console.log('[SSEStreamHandler] Parsed', events.length, 'events from chunk', chunkCount);

        for (const event of events) {
          // 检查是否已取消
          if (signal?.aborted) {
            return this.eventQueue;
          }

          eventCount++;
          this.eventQueue.push(event);
          this.addConsoleEntry(event);

          console.log('[SSEStreamHandler] Triggering onData for event', eventCount, 'timestamp:', event.timestamp);

          // Trigger data callback
          this.options.onData(event);

          // Trigger progress callback
          this.options.onProgress(this.eventQueue);
        }
      }
    } catch (error) {
      // 检查是否是取消错误
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[SSE] Stream aborted by user');
        return this.eventQueue;
      }
      this.options.onError(error as Error);
      throw error;
    } finally {
      // 确保释放 reader
      reader.releaseLock();
    }
  }

  /**
   * Add a console entry for an SSE event
   */
  private addConsoleEntry(event: SSEEvent): void {
    const entry: SSEConsoleEntry = {
      id: crypto.randomUUID(),
      event,
      timestamp: Date.now(),
    };

    // Try to parse data as JSON
    try {
      if (event.data) {
        entry.parsed = JSON.parse(event.data);
      }
    } catch {
      // Data is not valid JSON, keep as string
    }

    this.consoleEntries.push(entry);
  }

  /**
   * Get all console entries
   */
  getConsoleEntries(): SSEConsoleEntry[] {
    return this.consoleEntries;
  }

  /**
   * Reset the handler
   */
  reset(): void {
    this.eventQueue = [];
    this.consoleEntries = [];
    this.parser.reset();
  }
}
