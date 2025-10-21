/**
 * Standard Schema V1 type definitions
 * Based on: https://github.com/standard-schema/standard-schema
 *
 * Standard Schema provides a universal validation interface that works with
 * any validation library (Zod, Valibot, ArkType, Yup, etc.)
 */

/**
 * Standard Schema V1 interface
 *
 * @template Input - The input type accepted by the schema
 * @template Output - The output type produced after validation (may differ due to coercion/defaults)
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 *
 * const UserSchema = z.object({
 *   name: z.string(),
 *   age: z.number()
 * });
 *
 * // UserSchema implements StandardSchemaV1<unknown, User>
 * ```
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export namespace StandardSchemaV1 {
  /**
   * Standard Schema properties
   */
  export interface Props<Input = unknown, Output = Input> {
    /**
     * Version of the Standard Schema specification
     * Currently only version 1 is supported
     */
    readonly version: 1;

    /**
     * Name of the validation library
     * @example 'zod', 'valibot', 'arktype'
     */
    readonly vendor: string;

    /**
     * Validation function that checks if a value conforms to the schema
     *
     * @param value - The value to validate
     * @returns Validation result (either success with value, or failure with issues)
     *
     * @example
     * ```typescript
     * const result = schema['~standard'].validate(data);
     *
     * if ('issues' in result) {
     *   // Validation failed
     *   console.error(result.issues);
     * } else {
     *   // Validation succeeded
     *   const validated = result.value;
     * }
     * ```
     */
    readonly validate: (
      value: unknown,
    ) => Result<Output> | Promise<Result<Output>>;

    /**
     * Optional type information for static inference
     * Used by TypeScript for type-level operations
     */
    readonly types?: Types<Input, Output> | undefined;
  }

  /**
   * Validation result - either success or failure
   */
  export type Result<Output> = SuccessResult<Output> | FailureResult;

  /**
   * Successful validation result
   */
  export interface SuccessResult<Output> {
    /** The validated and potentially coerced output value */
    readonly value: Output;
    /** undefined when validation succeeds */
    readonly issues?: undefined;
  }

  /**
   * Failed validation result
   */
  export interface FailureResult {
    /** Array of validation issues found */
    readonly issues: ReadonlyArray<Issue>;
  }

  /**
   * A validation issue describing what went wrong
   */
  export interface Issue {
    /** Human-readable error message */
    readonly message: string;

    /**
     * Optional path to the field that failed validation
     * Can be an array of property keys or path segments
     *
     * @example
     * ```typescript
     * // Simple path
     * { message: 'Required', path: ['name'] }
     *
     * // Nested path
     * { message: 'Invalid email', path: ['user', 'email'] }
     *
     * // Array index
     * { message: 'Must be positive', path: ['items', 0, 'quantity'] }
     * ```
     */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  /**
   * Path segment with metadata
   * Used when additional information about the path is needed
   */
  export interface PathSegment {
    /** The property key or array index */
    readonly key: PropertyKey;
  }

  /**
   * Type information for static inference
   * Used by TypeScript to extract input/output types
   */
  export interface Types<Input = unknown, Output = Input> {
    /** The input type accepted by the schema */
    readonly input: Input;
    /** The output type produced after validation */
    readonly output: Output;
  }
}

/**
 * Extract input type from a Standard Schema
 *
 * @template TSchema - The schema to extract from
 *
 * @example
 * ```typescript
 * const UserSchema = z.object({ name: z.string() });
 * type UserInput = InferInput<typeof UserSchema>; // { name: string }
 * ```
 */
export type InferInput<TSchema> =
  TSchema extends StandardSchemaV1<infer Input, any> ? Input : never;

/**
 * Extract output type from a Standard Schema
 *
 * @template TSchema - The schema to extract from
 *
 * @example
 * ```typescript
 * const UserSchema = z.object({
 *   name: z.string(),
 *   createdAt: z.string().transform(s => new Date(s))
 * });
 *
 * type UserOutput = InferOutput<typeof UserSchema>;
 * // { name: string; createdAt: Date }
 * ```
 */
export type InferOutput<TSchema> =
  TSchema extends StandardSchemaV1<any, infer Output> ? Output : never;

/**
 * Type helper to validate that a schema matches a state type
 * Provides compile-time type checking for schema definitions
 *
 * @template TState - The expected state type
 * @template TSchema - The schema to validate
 *
 * @example
 * ```typescript
 * const CounterSchema = z.number().int();
 *
 * class CounterCubit extends Cubit<number> {
 *   // Type error if schema output doesn't match state type
 *   static schema: ValidateSchema<number, typeof CounterSchema> = CounterSchema;
 * }
 * ```
 */
export type ValidateSchema<
  TState,
  TSchema extends StandardSchemaV1<any, TState>,
> = TSchema;

/**
 * Type guard to check if a value is a Standard Schema
 *
 * @param value - The value to check
 * @returns true if the value implements StandardSchemaV1
 *
 * @example
 * ```typescript
 * const schema = z.number();
 *
 * if (isStandardSchema(schema)) {
 *   const result = schema['~standard'].validate(42);
 * }
 * ```
 */
export function isStandardSchema(
  value: unknown,
): value is StandardSchemaV1<unknown, unknown> {
  // ArkType schemas are functions, Zod/Valibot schemas are objects
  const isObjectOrFunction =
    (typeof value === 'object' && value !== null) ||
    typeof value === 'function';

  if (!isObjectOrFunction) {
    return false;
  }

  return (
    '~standard' in value &&
    typeof (value as any)['~standard'] === 'object' &&
    (value as any)['~standard'] !== null &&
    (value as any)['~standard'].version === 1 &&
    typeof (value as any)['~standard'].validate === 'function'
  );
}
