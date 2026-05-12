import type { SSEEvent, SSEParseOptions } from '../../types/sse';

/**
 * SSE Parser for parsing Server-Sent Events
 */
export class SSEParser {
  private buffer: string = '';
  private options: Required<SSEParseOptions>;

  constructor(options: SSEParseOptions = {}) {
    this.options = {
      ignoreComments: true,
      trimData: false, // 默认不 trim，保留换行符和空格
      ...options,
    };
  }

  /**
   * Parse a chunk of SSE data and return events
   */
  parse(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    const events: SSEEvent[] = [];

    while (true) {
      const result = this.extractNextEvent();
      if (!result) break;

      events.push(result.event);
      this.buffer = result.remainingBuffer;
    }

    return events;
  }

  /**
   * Extract the next SSE event from buffer
   */
  private extractNextEvent():
    | { event: SSEEvent; remainingBuffer: string }
    | null {
    const lines = this.buffer.split('\n');
    let currentEvent: Partial<SSEEvent> = {};
    let eventEndIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Empty line marks the end of an event
      if (trimmedLine === '') {
        if (Object.keys(currentEvent).length > 0) {
          currentEvent.timestamp = Date.now();
          eventEndIndex = i + 1;
          break;
        }
        continue;
      }

      // Skip comments
      if (this.options.ignoreComments && trimmedLine.startsWith(':')) {
        continue;
      }

      // Parse field
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        // No colon means this line should be ignored according to SSE spec
        continue;
      } else {
        const field = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1);

        // Remove single space after colon
        if (value.startsWith(' ')) {
          value = value.substring(1);
        }

        switch (field) {
          case 'data':
            // data can span multiple lines
            const existingData = currentEvent.data || '';
            currentEvent.data = existingData + (existingData ? '\n' : '') + value;
            break;
          case 'event':
            currentEvent.event = value;
            break;
          case 'id':
            currentEvent.id = value;
            break;
          case 'retry':
            currentEvent.retry = parseInt(value, 10);
            break;
        }
      }
    }

    if (eventEndIndex === -1) {
      return null;
    }

    // Trim data if option is enabled
    if (currentEvent.data && this.options.trimData) {
      currentEvent.data = currentEvent.data.trim();
    }

    return {
      event: currentEvent as SSEEvent,
      remainingBuffer: lines.slice(eventEndIndex).join('\n'),
    };
  }

  /**
   * Reset the parser buffer
   */
  reset() {
    this.buffer = '';
  }
}
