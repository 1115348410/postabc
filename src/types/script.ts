import type { RequestContext, ResponseData } from './index';

/**
 * Log entry from script execution
 */
export interface LogEntry {
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  args: any[];
  timestamp: number;
}

/**
 * Script execution result
 */
export interface ScriptExecutionResult {
  success: boolean;
  result?: any;
  error?: Error;
  logs: LogEntry[];
}

/**
 * Script execution context
 */
export interface ScriptContext {
  request: RequestContext;
  environment: Record<string, any>;
  response?: ResponseData;
}

/**
 * Pre-request script configuration
 */
export interface PreRequestScript {
  code: string;
  enabled: boolean;
}

/**
 * Test script configuration
 */
export interface TestScript {
  code: string;
  enabled: boolean;
}

/**
 * PM-style API for scripts (Postman-like)
 */
export interface PMAPI {
  environment: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
    clear: () => void;
  };
  variables: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
  };
  test: (name: string, fn: () => boolean | void) => void;
  expect: (actual: any) => ExpectChain;
}

/**
 * Expectation chain for assertions
 */
export interface ExpectChain {
  to: {
    eql: (expected: any) => void;
    be: {
      ok: () => void;
      null: () => void;
      undefined: () => void;
    };
    have: {
      property: (prop: string) => void;
    };
  };
}
