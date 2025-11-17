/**
 * Pre-configured tool sets for common use cases
 */

import type { Tool } from '../types.js';
import * as builtinBuilder from '../builders/builtin-builder.js';

/**
 * Readonly tools - safe for analysis without modification
 */
export function readonly(): Tool.BuiltInTool[] {
  return builtinBuilder.fromPreset('readonly');
}

/**
 * Code editor tools - full file manipulation
 */
export function codeEditor(): Tool.BuiltInTool[] {
  return builtinBuilder.fromPreset('codeEditor');
}

/**
 * Web research tools - searching and fetching web content
 */
export function webResearch(): Tool.BuiltInTool[] {
  return builtinBuilder.fromPreset('webResearch');
}

/**
 * Data analysis tools - working with data and notebooks
 */
export function dataAnalysis(): Tool.BuiltInTool[] {
  return builtinBuilder.fromPreset('dataAnalysis');
}

/**
 * All built-in tools
 */
export function all(): Tool.BuiltInTool[] {
  return builtinBuilder.allBuiltInTools();
}

/**
 * Safe tools only - no system modification
 */
export function safe(): Tool.BuiltInTool[] {
  const safeToolNames = [
    'Read',
    'Glob',
    'Grep',
    'WebFetch',
    'WebSearch',
    'TodoWrite',
    'BashOutput',
    'Skill',
    'SlashCommand',
    'ExitPlanMode',
    'Task',
  ];
  return builtinBuilder.fromClaudeTools(safeToolNames);
}
