/**
 * JSON Field Extractor - Extract specific fields from streaming JSON responses
 * Supports path expressions like: data.choices[0].delta.content
 */

export interface ExtractionRule {
  /** Field path expression (e.g., "data.choices[0].delta.content") */
  path: string;
  /** Alias name for display */
  alias?: string;
  /** Whether to concatenate values (useful for streaming text) */
  concatenate?: boolean;
}

export interface ExtractedField {
  path: string;
  alias: string;
  values: any[];
  concatenatedValue?: string;
}

/**
 * Parse a path expression into segments
 * Example: "data.choices[0].delta.content" -> ["data", "choices", "0", "delta", "content"]
 */
function parsePath(path: string): (string | number)[] {
  const segments: (string | number)[] = [];
  
  // Match both dot notation and bracket notation
  const regex = /([^.[\]]+)|\[(\d+)\]/g;
  let match;
  
  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      // Property name
      segments.push(match[1]);
    } else if (match[2] !== undefined) {
      // Array index
      segments.push(parseInt(match[2], 10));
    }
  }
  
  return segments;
}

/**
 * Get value from object by path segments
 */
function getValueBySegments(obj: any, segments: (string | number)[]): any {
  let current = obj;
  
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    if (typeof segment === 'number') {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment];
    } else {
      if (typeof current !== 'object') {
        return undefined;
      }
      current = current[segment];
    }
  }
  
  return current;
}

/**
 * Extract fields from a JSON object based on extraction rules
 */
export function extractFields(
  data: any,
  rules: ExtractionRule[]
): ExtractedField[] {
  const results: ExtractedField[] = [];
  
  for (const rule of rules) {
    const segments = parsePath(rule.path);
    const value = getValueBySegments(data, segments);
    
    if (value !== undefined) {
      results.push({
        path: rule.path,
        alias: rule.alias || rule.path,
        values: [value],
        concatenatedValue: rule.concatenate ? String(value) : undefined,
      });
    }
  }
  
  return results;
}

/**
 * Extract and accumulate fields from multiple JSON objects (for streaming)
 */
export class StreamingFieldExtractor {
  private rules: ExtractionRule[];
  private accumulatedFields: Map<string, ExtractedField>;
  
  constructor(rules: ExtractionRule[]) {
    this.rules = rules;
    this.accumulatedFields = new Map();
  }
  
  /**
   * Process a new JSON object and extract fields
   */
  process(data: any): ExtractedField[] {
    const extracted = extractFields(data, this.rules);
    
    for (const field of extracted) {
      const existing = this.accumulatedFields.get(field.path);
      
      if (existing) {
        // Accumulate values
        existing.values.push(...field.values);
        
        // Update concatenated value
        const rule = this.rules.find(r => r.path === field.path);
        if (rule?.concatenate) {
          const newValues = field.values.map(v => String(v)).join('');
          existing.concatenatedValue = (existing.concatenatedValue || '') + newValues;
        }
      } else {
        this.accumulatedFields.set(field.path, { ...field });
      }
    }
    
    return extracted;
  }
  
  /**
   * Get all accumulated fields
   */
  getAccumulatedFields(): ExtractedField[] {
    return Array.from(this.accumulatedFields.values());
  }
  
  /**
   * Get concatenated text from a specific field path
   */
  getConcatenatedText(path: string): string {
    const field = this.accumulatedFields.get(path);
    return field?.concatenatedValue || '';
  }
  
  /**
   * Reset the extractor
   */
  reset(): void {
    this.accumulatedFields.clear();
  }
}

/**
 * Try to parse SSE event data as JSON
 */
export function tryParseJson(data: string): any | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Default extraction rules for common LLM streaming formats
 */
export const DEFAULT_LLM_RULES: ExtractionRule[] = [
  {
    path: 'choices[0].delta.content',
    alias: 'content',
    concatenate: true,
  },
  {
    path: 'choices[0].text',
    alias: 'text',
    concatenate: true,
  },
  {
    path: 'message.content',
    alias: 'message',
    concatenate: true,
  },
  {
    path: 'data',
    alias: 'data',
  },
];
