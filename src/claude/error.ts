/**
 * Custom error classes for Claude Code operations
 */

/**
 * Base error class for all Claude-related errors
 */
export class ClaudeError extends Error {
  public readonly code?: string;
  public readonly exitCode?: number;
  public readonly stderr?: string;

  constructor(message: string, options?: { code?: string; exitCode?: number; stderr?: string }) {
    super(message);
    this.name = 'ClaudeError';
    this.code = options?.code;
    this.exitCode = options?.exitCode;
    this.stderr = options?.stderr;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, ClaudeError);
    }
  }
}

/**
 * Error thrown when the Claude process fails to spawn or execute
 */
export class ClaudeProcessError extends ClaudeError {
  constructor(message: string, options?: { code?: string; exitCode?: number; stderr?: string }) {
    super(message, options);
    this.name = 'ClaudeProcessError';

    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, ClaudeProcessError);
    }
  }
}

/**
 * Error thrown when an operation times out
 */
export class ClaudeTimeoutError extends ClaudeError {
  public readonly timeout: number;

  constructor(message: string, timeout: number) {
    super(message, { code: 'TIMEOUT' });
    this.name = 'ClaudeTimeoutError';
    this.timeout = timeout;

    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, ClaudeTimeoutError);
    }
  }
}

/**
 * Error thrown when stream parsing fails
 */
export class ClaudeParseError extends ClaudeError {
  public readonly rawData?: string;

  constructor(message: string, rawData?: string) {
    super(message, { code: 'PARSE_ERROR' });
    this.name = 'ClaudeParseError';
    this.rawData = rawData;

    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, ClaudeParseError);
    }
  }
}

/**
 * Error thrown when the Claude API returns an error
 */
export class ClaudeAPIError extends ClaudeError {
  public readonly response?: unknown;

  constructor(message: string, options?: { code?: string; exitCode?: number; stderr?: string; response?: unknown }) {
    super(message, options);
    this.name = 'ClaudeAPIError';
    this.response = options?.response;

    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, ClaudeAPIError);
    }
  }
}

/**
 * Error thrown when session operations fail
 */
export class ClaudeSessionError extends ClaudeError {
  public readonly sessionId?: string;

  constructor(message: string, sessionId?: string) {
    super(message, { code: 'SESSION_ERROR' });
    this.name = 'ClaudeSessionError';
    this.sessionId = sessionId;

    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, ClaudeSessionError);
    }
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ClaudeConfigError extends ClaudeError {
  constructor(message: string) {
    super(message, { code: 'CONFIG_ERROR' });
    this.name = 'ClaudeConfigError';

    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, ClaudeConfigError);
    }
  }
}
