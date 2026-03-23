import { ScriptSandbox } from './sandbox';
import type {
  ScriptContext,
  ScriptExecutionResult,
  PreRequestScript,
  TestScript,
} from '../../types/script';

/**
 * Script Executor for managing script execution
 */
export class ScriptExecutor {
  /**
   * Execute a pre-request script
   */
  async executePreRequestScript(
    script: PreRequestScript,
    context: ScriptContext
  ): Promise<ScriptExecutionResult> {
    if (!script.enabled || !script.code.trim()) {
      return { success: true, logs: [] };
    }

    const sandbox = new ScriptSandbox(context);
    const result = await sandbox.executeScript(script.code);

    // Update context with modified environment
    if (result.success) {
      context.environment = { ...sandbox.getEnvironment() };
    }

    return result;
  }

  /**
   * Execute a test script
   */
  async executeTestScript(
    script: TestScript,
    context: ScriptContext
  ): Promise<ScriptExecutionResult> {
    if (!script.enabled || !script.code.trim()) {
      return { success: true, logs: [] };
    }

    const sandbox = new ScriptSandbox(context);
    return await sandbox.executeScript(script.code);
  }
}
