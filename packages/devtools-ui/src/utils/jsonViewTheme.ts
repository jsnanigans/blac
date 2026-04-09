import { T } from '../theme';

export function jsonViewTheme(backgroundColor: string): Record<string, string> {
  return {
    '--w-rjv-font-family': 'Monaco, Menlo, Consolas, monospace',
    '--w-rjv-background-color': backgroundColor,
    '--w-rjv-color': '#d4d4d4',
    '--w-rjv-key-string': '#9cdcfe',
    '--w-rjv-info-color': '#6a9955',
    '--w-rjv-border-left': '1px solid #333',
    '--w-rjv-line-color': backgroundColor,
    '--w-rjv-arrow-color': '#858585',
    '--w-rjv-edit-color': '#569cd6',
    '--w-rjv-add-color': T.success,
    '--w-rjv-del-color': '#ef4444',
    '--w-rjv-copied-color': T.success,
    '--w-rjv-curlybraces-color': '#d4d4d4',
    '--w-rjv-brackets-color': '#d4d4d4',
    '--w-rjv-ellipsis-color': '#858585',
    '--w-rjv-quotes-color': '#ce9178',
    '--w-rjv-quotes-string-color': '#ce9178',
    '--w-rjv-type-string-color': '#ce9178',
    '--w-rjv-type-int-color': '#b5cea8',
    '--w-rjv-type-float-color': '#b5cea8',
    '--w-rjv-type-bigint-color': '#b5cea8',
    '--w-rjv-type-boolean-color': '#569cd6',
    '--w-rjv-type-date-color': '#c586c0',
    '--w-rjv-type-url-color': '#3b82f6',
    '--w-rjv-type-null-color': '#569cd6',
    '--w-rjv-type-nan-color': '#ef4444',
    '--w-rjv-type-undefined-color': '#569cd6',
  };
}
