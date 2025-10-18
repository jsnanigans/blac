import { BlacError, ErrorCategory, ErrorSeverity } from '../errors';
import { StandardSchemaV1 } from './types';

/**
 * Error thrown when state validation fails
 *
 * This error extends BlacError with the VALIDATION category and FATAL severity,
 * ensuring that validation failures are logged and propagated immediately.
 *
 * @example
 * ```typescript
 * try {
 *   cubit.emit(invalidState);
 * } catch (error) {
 *   if (error instanceof BlocValidationError) {
 *     console.error('Validation failed:', error.issues);
 *     console.error('Attempted state:', error.attemptedState);
 *     console.error('Current state:', error.currentState);
 *   }
 * }
 * ```
 */
export class BlocValidationError extends BlacError {
  readonly name = 'BlocValidationError';

  /**
   * Array of validation issues that caused the failure
   */
  readonly issues: readonly StandardSchemaV1.Issue[];

  /**
   * The state value that failed validation
   */
  readonly attemptedState: unknown;

  /**
   * The current valid state before the failed validation attempt
   */
  readonly currentState: unknown;

  /**
   * Create a new BlocValidationError
   *
   * @param issues - Validation issues from the schema
   * @param attemptedState - The state value that failed validation
   * @param currentState - The current valid state
   * @param blocName - Name of the bloc that failed validation
   */
  constructor(
    issues: readonly StandardSchemaV1.Issue[],
    attemptedState: unknown,
    currentState: unknown,
    blocName: string,
  ) {
    const summary = BlocValidationError.formatIssues(issues);

    super(
      `State validation failed: ${summary}`,
      ErrorCategory.VALIDATION,
      ErrorSeverity.FATAL, // FATAL ensures error propagates
      {
        blocName,
        operation: 'emit',
        metadata: {
          attemptedState,
          currentState,
          issueCount: issues.length,
          issues: issues.map((issue) => ({
            message: issue.message,
            path: issue.path
              ? issue.path.map((p) =>
                  typeof p === 'object' && 'key' in p ? p.key : p,
                )
              : undefined,
          })),
        },
      },
    );

    this.issues = issues;
    this.attemptedState = attemptedState;
    this.currentState = currentState;
  }

  /**
   * Get the first validation issue
   * Useful for displaying a primary error message
   *
   * @example
   * ```typescript
   * catch (error) {
   *   if (error instanceof BlocValidationError) {
   *     console.error('Primary error:', error.firstIssue.message);
   *   }
   * }
   * ```
   */
  get firstIssue(): StandardSchemaV1.Issue {
    return this.issues[0]!;
  }

  /**
   * Check if a specific path has a validation issue
   *
   * @param path - The path to check (e.g., "user.email" or "items.0.name")
   * @returns true if an issue exists at that path
   *
   * @example
   * ```typescript
   * if (error.hasIssueAt('user.email')) {
   *   console.error('Email validation failed');
   * }
   * ```
   */
  hasIssueAt(path: string): boolean {
    return this.issues.some(
      (issue) => issue.path && this.formatPath(issue.path) === path,
    );
  }

  /**
   * Get all issues for a specific path
   *
   * @param path - The path to get issues for
   * @returns Array of issues at that path
   *
   * @example
   * ```typescript
   * const emailErrors = error.getIssuesAt('user.email');
   * emailErrors.forEach(issue => {
   *   console.error(issue.message);
   * });
   * ```
   */
  getIssuesAt(path: string): StandardSchemaV1.Issue[] {
    return this.issues.filter(
      (issue) => issue.path && this.formatPath(issue.path) === path,
    );
  }

  /**
   * Format issue path as dot-separated string
   *
   * @param path - The path array to format
   * @returns Formatted path string (e.g., "user.address.city")
   */
  private formatPath(
    path: readonly (PropertyKey | StandardSchemaV1.PathSegment)[],
  ): string {
    return path
      .map((segment) => {
        if (typeof segment === 'object' && 'key' in segment) {
          return String(segment.key);
        }
        return String(segment);
      })
      .join('.');
  }

  /**
   * Format multiple issues into a readable summary
   *
   * @param issues - The validation issues to format
   * @returns Human-readable summary string
   */
  private static formatIssues(
    issues: readonly StandardSchemaV1.Issue[],
  ): string {
    if (issues.length === 0) {
      return 'Unknown validation error';
    }

    if (issues.length === 1) {
      const issue = issues[0]!;
      if (issue.path && issue.path.length > 0) {
        const path = issue.path
          .map((p) => (typeof p === 'object' && 'key' in p ? p.key : p))
          .join('.');
        return `${path}: ${issue.message}`;
      }
      return issue.message;
    }

    // Multiple issues - return count summary
    return `${issues.length} validation issue(s)`;
  }

  /**
   * Convert to JSON-serializable format
   * Useful for logging and debugging
   *
   * @returns JSON-serializable object representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      blocName: this.context?.blocName,
      issues: this.issues.map((issue) => ({
        message: issue.message,
        path: issue.path
          ? issue.path.map((p) =>
              typeof p === 'object' && 'key' in p ? p.key : p,
            )
          : undefined,
      })),
      attemptedState: this.attemptedState,
      currentState: this.currentState,
    };
  }
}
