import type {
  ScriptContext,
  LogEntry,
  ScriptExecutionResult,
  PMAPI,
  ExpectChain,
} from '../../types/script';

/**
 * Script Sandbox for safely executing user scripts
 */
export class ScriptSandbox {
  private context: ScriptContext;
  private logs: LogEntry[] = [];
  private console: Console;
  private utils: Record<string, Function>;
  private pm: PMAPI;

  constructor(context: ScriptContext) {
    this.context = context;
    this.console = this.createSandboxConsole();
    this.utils = this.createUtils();
    this.pm = this.createPMAPI();
  }

  /**
   * Execute a script in the sandbox
   */
  async executeScript(script: string): Promise<ScriptExecutionResult> {
    this.logs = [];

    try {
      // Create a function with isolated scope
      const scriptFn = new Function(
        'request',
        'environment',
        'console',
        'utils',
        'pm',
        'response',
        `"use strict";\n${script}`
      );

      const result = await scriptFn(
        this.context.request,
        this.context.environment,
        this.console,
        this.utils,
        this.pm,
        this.context.response
      );

      return {
        success: true,
        result,
        logs: this.logs,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        logs: this.logs,
      };
    }
  }

  /**
   * Create a sandbox console that captures logs
   */
  private createSandboxConsole(): Console {
    const logs = this.logs;

    const createLog = (level: LogEntry['level']) => (...args: any[]) => {
      logs.push({
        level,
        args,
        timestamp: Date.now(),
      });
      // Also log to real console for debugging
      console[level]('[PostABC Script]', ...args);
    };

    return {
      log: createLog('log'),
      error: createLog('error'),
      warn: createLog('warn'),
      info: createLog('info'),
      debug: createLog('debug'),
      table: createLog('log'),
      dir: createLog('log'),
      dirxml: createLog('log'),
      group: createLog('log'),
      groupCollapsed: createLog('log'),
      groupEnd: () => {},
      clear: () => {},
      count: () => {},
      countReset: () => {},
      assert: () => {},
      profile: () => {},
      profileEnd: () => {},
      time: () => {},
      timeLog: () => {},
      timeEnd: () => {},
      timeStamp: () => {},
      trace: createLog('log'),
    } as Console;
  }

  /**
   * Create utility functions available in scripts
   */
  private createUtils(): Record<string, any> {
    return {
      _: {
        // lodash-like utilities
        get: (obj: any, path: string, defaultValue?: any) => {
          return path
            .split('.')
            .reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
        },
        set: (obj: any, path: string, value: any) => {
          const parts = path.split('.');
          const last = parts.pop()!;
          const target = parts.reduce(
            (acc, part) => acc[part] ?? (acc[part] = {}),
            obj
          );
          target[last] = value;
          return obj;
        },
        merge: (target: any, ...sources: any[]) =>
          Object.assign(target, ...sources),
        keys: (obj: any) => Object.keys(obj),
        values: (obj: any) => Object.values(obj),
        entries: (obj: any) => Object.entries(obj),
      },
      // Encoding/decoding
      encode: encodeURIComponent,
      decode: decodeURIComponent,
      btoa: (str: string) => btoa(str),
      atob: (str: string) => atob(str),
      // Random
      random: () => Math.random(),
      randomInt: (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min,
      uuid: () => crypto.randomUUID(),
      // Time
      timestamp: () => Date.now(),
      formatTime: (date: Date) => date.toISOString(),
    };
  }

  /**
   * Create Postman-like API
   */
  private createPMAPI(): PMAPI {
    const context = this.context;

    return {
      environment: {
        get: (key: string) => context.environment[key],
        set: (key: string, value: any) => {
          context.environment[key] = value;
        },
        clear: () => {
          Object.keys(context.environment).forEach(
            (k) => delete context.environment[k]
          );
        },
      },
      variables: {
        get: (key: string) => context.environment[key],
        set: (key: string, value: any) => {
          context.environment[key] = value;
        },
      },
      test: (name: string, fn: () => boolean | void) => {
        try {
          const result = fn();
          if (result !== false) {
            this.console.log(`✓ ${name}`);
          } else {
            this.console.error(`✗ ${name}`);
          }
        } catch (error) {
          this.console.error(`✗ ${name}:`, error);
        }
      },
      expect: (actual: any) => {
        const expectChain: ExpectChain = {
          to: {
            eql: (expected: any) => {
              if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(
                  `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(
                    expected
                  )}`
                );
              }
            },
            be: {
              ok: () => {
                if (!actual) {
                  throw new Error(`Expected ${actual} to be truthy`);
                }
              },
              null: () => {
                if (actual !== null) {
                  throw new Error(`Expected ${actual} to be null`);
                }
              },
              undefined: () => {
                if (actual !== undefined) {
                  throw new Error(`Expected ${actual} to be undefined`);
                }
              },
            },
            have: {
              property: (prop: string) => {
                if (!(prop in actual)) {
                  throw new Error(`Expected ${actual} to have property ${prop}`);
                }
              },
            },
          },
        };

        return expectChain;
      },
    };
  }

  /**
   * Update the context
   */
  updateContext(context: Partial<ScriptContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get the current environment variables
   */
  getEnvironment(): Record<string, any> {
    return this.context.environment;
  }

  /**
   * Get the execution logs
   */
  getLogs(): LogEntry[] {
    return this.logs;
  }
}
