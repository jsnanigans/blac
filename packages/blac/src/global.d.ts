/**
 * Global type declarations for BlaC
 */

/**
 * Build-time flag for logging
 * Set via DefinePlugin (Webpack) or define (Vite/Rollup)
 *
 * @example
 * ```ts
 * // webpack.config.js
 * new webpack.DefinePlugin({
 *   __BLAC_LOGGING__: JSON.stringify(process.env.NODE_ENV !== 'production'),
 * });
 *
 * // vite.config.js
 * export default {
 *   define: {
 *     __BLAC_LOGGING__: JSON.stringify(process.env.NODE_ENV !== 'production'),
 *   }
 * };
 * ```
 */
declare const __BLAC_LOGGING__: boolean;
