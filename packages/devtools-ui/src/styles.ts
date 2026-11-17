/* Tokens follow riff's zinc theme (riff-app/src/index.css), resolved to plain
   values because the UI lives in a shadow root without the host's Tailwind. */

const DARK = `
  color-scheme: dark;
  --background: #000;
  --foreground: #f5f5f5;
  --card: #141414;
  --muted: rgb(255 255 255 / 0.03);
  --muted-foreground: #b4b4b4;
  --accent: rgb(255 255 255 / 0.06);
  --border: rgb(255 255 255 / 0.08);
  --input: rgb(255 255 255 / 0.11);
  --primary: oklch(0.571 0.21 264);
  --selected: rgb(255 255 255 / 0.09);
  --destructive: #f05252;
  --destructive-foreground: #f87171;
  --success-foreground: #34d399;
  --warning-foreground: #fbbf24;
  --info-foreground: #60a5fa;
  --special: #c4b5fd;
  --tint: 16%;
  --hue-l: 0.8;
  --hue-c: 0.13;
  --hue-bg: 22%;
  --shadow: 0 12px 32px rgb(0 0 0 / 0.6), 0 0 0 1px rgb(255 255 255 / 0.1);
`;

const SCOPES = ['.bd', '.bd-float', '.bd-pip'];
const scoped = (suffix: string) =>
  SCOPES.map((scope) => `${scope}${suffix}`).join(', ');

export const CSS = `
${scoped('')} {
  color-scheme: light;
  --radius: 8px;
  --background: #fcfcfc;
  --foreground: #18181b;
  --card: #fff;
  --muted: #f4f4f5;
  --muted-foreground: #52525b;
  --accent: #f4f4f5;
  --border: #dcdce0;
  --input: #d4d4d8;
  --primary: oklch(0.488 0.217 264);
  --primary-foreground: #fff;
  --ring: var(--primary);
  --selected: color-mix(in srgb, var(--primary) 9%, transparent);
  --destructive: #ef4444;
  --destructive-foreground: #991b1b;
  --success: #10b981;
  --success-foreground: #065f46;
  --warning: #f59e0b;
  --warning-foreground: #92400e;
  --info: #3b82f6;
  --info-foreground: #1d4ed8;
  --special: #6d28d9;
  --tint: 9%;
  --hue-l: 0.5;
  --hue-c: 0.15;
  --hue-bg: 14%;
  --shadow: 0 12px 32px rgb(0 0 0 / 0.16), 0 0 0 1px rgb(0 0 0 / 0.06);
  --sans: -apple-system, BlinkMacSystemFont, 'Inter Variable', Inter, 'Segoe UI', system-ui, sans-serif;
  --mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
}
${scoped("[data-theme='dark']")} {${DARK}}
@media (prefers-color-scheme: dark) {
  ${scoped("[data-theme='auto']")} {${DARK}}
}

.bd, .bd *, .bd-float, .bd-float * { box-sizing: border-box; }
.bd {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--background);
  color: var(--foreground);
  font: 12px/1.45 var(--sans);
  -webkit-font-smoothing: antialiased;
}
.bd p, .bd ul { margin: 0; padding: 0; }
.bd ul { list-style: none; }
.bd button, .bd input { font: inherit; color: inherit; }
.bd button { cursor: pointer; }
.bd button:disabled { cursor: default; opacity: 0.5; }
.bd :focus-visible { outline: 2px solid color-mix(in srgb, var(--ring) 60%, transparent); outline-offset: -2px; }
.bd .icon { flex: none; display: block; }
.bd .muted { color: var(--muted-foreground); }
.bd .mono { font-family: var(--mono); font-size: 11px; }
.bd .num { font-variant-numeric: tabular-nums; }
.bd ::-webkit-scrollbar { width: 6px; height: 6px; }
.bd ::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--foreground) 12%, transparent); }

/* Header: title, tabs, status, window actions */
.bd .head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  height: 36px;
  padding: 0 6px 0 12px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  user-select: none;
}
.bd .head[data-drag] { cursor: grab; touch-action: none; }
.bd .head[data-drag]:active { cursor: grabbing; }
.bd .brand { font-weight: 600; letter-spacing: -0.01em; }
.bd .head .spacer { flex: 1; }
.bd .status { display: flex; align-items: center; gap: 6px; color: var(--muted-foreground); white-space: nowrap; }
.bd .status[data-tone='success'] { color: var(--success-foreground); }
.bd .status[data-tone='warn'] { color: var(--warning-foreground); }
.bd .status[data-tone='danger'] { color: var(--destructive-foreground); }
.bd .status .label { color: var(--muted-foreground); }

/* Buttons */
.bd .btn, .bd .icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: none;
  height: 24px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: calc(var(--radius) - 2px);
  background: none;
  color: var(--muted-foreground);
  white-space: nowrap;
  transition: background-color 150ms var(--ease), color 150ms var(--ease);
}
.bd .icon-btn { width: 24px; padding: 0; }
.bd .btn:hover:not(:disabled), .bd .icon-btn:hover:not(:disabled) { background: var(--accent); color: var(--foreground); }
.bd .btn[data-variant='outline'] { border-color: var(--input); color: var(--foreground); }

.bd .seg { display: flex; flex: none; padding: 2px; border: 1px solid var(--input); border-radius: calc(var(--radius) - 2px); }
.bd .seg button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 8px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--muted-foreground);
}
.bd .seg button:hover { color: var(--foreground); }
.bd .seg button[aria-pressed='true'] { background: var(--accent); color: var(--foreground); font-weight: 500; }
.bd .seg .num { color: var(--muted-foreground); font-weight: 400; }

.bd .badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  height: 18px;
  padding: 0 5px;
  background: color-mix(in srgb, var(--foreground) 6%, transparent);
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}
.bd .badge[data-tone='warn'] { background: color-mix(in srgb, var(--warning) var(--tint), transparent); color: var(--warning-foreground); }
.bd .badge[data-tone='danger'] { background: color-mix(in srgb, var(--destructive) var(--tint), transparent); color: var(--destructive-foreground); }
.bd .badge[data-tone='info'] { background: color-mix(in srgb, var(--info) var(--tint), transparent); color: var(--info-foreground); }

.bd .kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border: 1px solid var(--border);
  background: var(--muted);
  color: var(--muted-foreground);
  font: 10px/1 var(--sans);
}

/* Layout */
.bd .split { display: flex; flex: 1; min-height: 0; }
.bd .pane { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.bd .list-pane { flex: none; border-right: 1px solid var(--border); }
.bd .main-pane { flex: 1; }
.bd .scroll { position: relative; flex: 1; min-height: 0; overflow: auto; }
.bd .resize { flex: none; width: 5px; margin: 0 -3px 0 -2px; position: relative; z-index: 1; cursor: col-resize; touch-action: none; }
.bd .resize:hover, .bd .resize:focus-visible { outline: 0; background: color-mix(in srgb, var(--primary) 40%, transparent); }

.bd .toolbar { display: flex; align-items: center; gap: 6px; flex: none; height: 40px; padding: 0 8px; border-bottom: 1px solid var(--border); }
.bd .search { position: relative; display: flex; align-items: center; flex: 1; min-width: 0; }
.bd .search > .icon { position: absolute; left: 8px; color: var(--muted-foreground); pointer-events: none; }
.bd .search > .kbd { position: absolute; right: 6px; pointer-events: none; }
.bd .search input {
  width: 100%;
  height: 26px;
  padding: 0 24px 0 26px;
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: var(--card);
  outline: 0;
}
.bd .search input::placeholder { color: var(--muted-foreground); }
.bd .search input:focus-visible { border-color: var(--ring); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent); }
.bd .search input:focus ~ .kbd, .bd .search input:not(:placeholder-shown) ~ .kbd { display: none; }
.bd .search input::-webkit-search-cancel-button { display: none; }

/* Lists and rows */
.bd .line { position: relative; display: flex; align-items: stretch; }
.bd .flash { position: absolute; inset: 0; pointer-events: none; animation: bd-flash 1.8s var(--ease) forwards; }
.bd .twisty { display: flex; align-items: center; justify-content: center; flex: none; width: 18px; padding: 0; border: 0; background: none; color: var(--muted-foreground); }
.bd button.twisty:hover { color: var(--foreground); }
.bd .twisty .icon { transition: transform 150ms var(--ease); }
.bd .twisty[aria-expanded='true'] .icon { transform: rotate(90deg); }
.bd .line .row { padding: 5px 10px 5px 0; }
.bd section + section { border-top: 1px solid var(--border); }
.bd .hue, .bd .line { --hue: oklch(var(--hue-l) var(--hue-c) var(--h, 0)); }
.bd .mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 18px;
  height: 18px;
  background: color-mix(in oklch, oklch(var(--hue-l) var(--hue-c) var(--h, 0)) var(--hue-bg), transparent);
  color: oklch(var(--hue-l) var(--hue-c) var(--h, 0));
  font: 600 9px/1 var(--sans);
  letter-spacing: 0.02em;
}
.bd .line.group > .row { padding-left: 0; }
.bd .line.group .twisty { width: 18px; margin-right: -8px; align-self: stretch; }
.bd .line.group .twisty .icon { transition: transform 150ms var(--ease); }
.bd .line.group .row[aria-expanded='true'] .twisty .icon { transform: rotate(90deg); }
.bd .line.group .row:hover .twisty { color: var(--foreground); }
.bd .line.group .badge { margin-left: auto; }
.bd section[data-group] { background: color-mix(in oklch, var(--hue, transparent) 3%, transparent); }
.bd .line[data-child]::before { content: ''; position: absolute; top: 0; bottom: 0; left: 26px; width: 2px; background: color-mix(in oklch, var(--hue) 50%, transparent); }
.bd .line[data-child] .row { padding-left: 26px; }
.bd .row-key { color: var(--foreground); }
.bd .row-key[data-default] { color: var(--muted-foreground); }
.bd .line:has(> .row:hover) { background: var(--accent); }
.bd .line:has(> .row[aria-pressed='true']) { background: var(--selected); box-shadow: inset 2px 0 var(--primary); }
.bd .line > button.row:hover, .bd .line > .row[aria-pressed='true'] { background: none; box-shadow: none; }
.bd .row-line { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bd .row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 6px 10px;
  border: 0;
  background: none;
  text-align: left;
  animation: bd-enter 150ms var(--ease);
}
.bd button.row:hover { background: var(--accent); }
.bd .row[aria-pressed='true'] { background: var(--selected); box-shadow: inset 2px 0 var(--primary); }
.bd .row-icon { display: flex; width: 14px; justify-content: center; color: var(--muted-foreground); }
.bd .row-icon[data-kind='created'] { color: var(--success-foreground); }
.bd .row-icon[data-kind='disposed'] { color: var(--destructive-foreground); }
.bd .row-icon[data-kind='changed'] { color: var(--info-foreground); }
.bd .row-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.bd .row-text > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bd .row-primary { font-weight: 500; }
.bd .row-meta { color: var(--muted-foreground); font-size: 11px; }
.bd .row-end { flex: none; margin-left: auto; color: var(--muted-foreground); font-size: 11px; font-variant-numeric: tabular-nums; }
.bd .row[data-disposed] .row-primary { text-decoration: line-through; color: var(--muted-foreground); font-weight: 400; }
.bd .row[data-disposed] { opacity: 0.7; transition: opacity 500ms var(--ease); }
.bd .row .ver { display: inline-block; }
.bd .row .ver[data-changed] { color: var(--info-foreground); }
.bd .row .ver[data-flash] { animation: bd-pop 1.8s var(--ease); }
.bd .card .row[data-flash] { animation: bd-flash 1.8s var(--ease); }
.bd .more { margin: 4px 6px 8px; }
.bd .skeleton-row { animation: none; }
.bd .skeleton { display: block; height: 10px; background: linear-gradient(90deg, var(--muted) 25%, var(--accent) 50%, var(--muted) 75%); background-size: 200% 100%; animation: bd-shimmer 1.4s linear infinite; }

.bd .card { margin: 8px; border: 1px solid var(--border); background: var(--card); overflow: hidden; }
.bd .card > * + * { border-top: 1px solid var(--border); }
.bd .card .row { padding: 7px 12px; }

/* States */
.bd .empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 28px 16px; text-align: center; }
.bd .empty-title { font-weight: 500; }
.bd .empty-hint { max-width: 320px; color: var(--muted-foreground); }
.bd .empty-hint .kbd { margin: 0 2px; }
.bd .notice { display: flex; gap: 8px; margin: 12px; padding: 12px; border: 1px solid var(--border); background: var(--card); }
.bd .notice > .icon { margin-top: 1px; color: var(--info-foreground); }
.bd .notice[data-tone='warn'] > .icon { color: var(--warning-foreground); }
.bd .notice[data-tone='danger'] > .icon { color: var(--destructive-foreground); }
.bd .notice-title { font-weight: 500; }
.bd .notice-body { margin-top: 2px; color: var(--muted-foreground); }
.bd code { font-family: var(--mono); font-size: 11px; }

/* Inspector */
.bd .insp-head { display: flex; flex-direction: column; gap: 8px; flex: none; padding: 10px 12px; border-bottom: 1px solid var(--border); }
.bd .insp-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.bd .insp-title .mark { width: 22px; height: 22px; font-size: 10px; }
.bd .insp-title h2 { margin: 0; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bd .insp-title .key { color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bd .insp-title .actions { display: flex; gap: 2px; margin-left: auto; }
.bd .insp-meta { display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--muted-foreground); font-size: 11px; }
.bd .insp-meta > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bd .insp-bar { display: flex; align-items: center; gap: 8px; }
.bd .insp-bar .pinned { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.bd .insp-body { flex: 1; min-height: 0; overflow: auto; padding: 10px 12px; }
.bd .back { display: none; }

.bd .tree { font-family: var(--mono); font-size: 11px; line-height: 1.6; }
.bd .tree .node, .bd .tree .leaf { display: flex; align-items: center; gap: 0; width: fit-content; max-width: 100%; padding: 0 6px 0 0; border: 0; background: none; text-align: left; white-space: nowrap; }
.bd .tree .leaf { padding-left: 14px; }
.bd .tree .node:hover { background: var(--accent); }
.bd .tree .kids { margin-left: 6px; padding-left: 8px; border-left: 1px solid var(--border); }
.bd .tree .caret { margin-right: 2px; color: var(--muted-foreground); transition: transform 150ms var(--ease); }
.bd .tree .node[aria-expanded='true'] .caret { transform: rotate(90deg); }
.bd .tree .inside .caret { color: var(--info-foreground); }
.bd .tree .val { overflow: hidden; text-overflow: ellipsis; }
.bd .tree .sep { white-space: pre; }
.bd .key { color: var(--foreground); }
.bd .val.string { color: var(--success-foreground); }
.bd .val.number, .bd .val.boolean, .bd .val.bigint { color: var(--info-foreground); }
.bd .val.special { color: var(--special); }
.bd .tree [data-mark] { box-shadow: inset 2px 0 var(--info); animation: bd-mark 2.4s var(--ease); }
.bd .tree [data-mark='added'] { box-shadow: inset 2px 0 var(--success); }
.bd .tree [data-mark='removed'] { box-shadow: inset 2px 0 var(--destructive); }

.bd .changes > li { display: flex; align-items: baseline; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border); font-family: var(--mono); font-size: 11px; }
.bd .changes > li:last-child { border-bottom: 0; }
.bd .changes .sign { flex: none; width: 10px; text-align: center; color: var(--muted-foreground); }
.bd .changes [data-kind='added'] .sign { color: var(--success-foreground); }
.bd .changes [data-kind='removed'] .sign { color: var(--destructive-foreground); }
.bd .changes .path { flex: none; max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bd .changes .vals { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 6px; min-width: 0; }
.bd .changes del, .bd .changes ins { padding: 0 3px; text-decoration: none; overflow-wrap: anywhere; }
.bd .changes del { background: color-mix(in srgb, var(--destructive) var(--tint), transparent); }
.bd .changes ins { background: color-mix(in srgb, var(--success) calc(var(--tint) + 2%), transparent); }
.bd .caption { margin-bottom: 6px; color: var(--muted-foreground); font-size: 11px; }

.bd .churn {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  width: 100%;
  padding: 6px 10px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--warning) calc(var(--tint) / 2), transparent);
  text-align: left;
}
.bd .churn > .icon { color: var(--warning-foreground); }
.bd .churn:hover { background: color-mix(in srgb, var(--warning) var(--tint), transparent); }

.bd .facts { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0 0 16px; }
.bd .facts dt { color: var(--muted-foreground); }
.bd .facts dd { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-width: 0; margin: 0; }
.bd .activity { display: inline-flex; align-items: center; gap: 8px; }
.bd .spark rect { fill: var(--info); }
.bd .spark rect[data-zero] { fill: var(--border); }
.bd .info .card { margin: 0 0 8px; }
.bd .refs > p { padding: 5px 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bd .refs-head { font-weight: 500; background: var(--muted); }

/* Narrow: one pane at a time, the inspector pushes over the list */
@container (max-width: 600px) {
  .bd .list-pane { flex: 1; width: auto !important; border-right: 0; }
  .bd .split .resize { display: none; }
  .bd .split[data-selected] .list-pane, .bd .split:not([data-selected]) .main-pane { display: none; }
  .bd .back { display: inline-flex; margin-left: -6px; }
  .bd .head .brand { display: none; }
}

/* Floating window */
.bd-float {
  position: fixed;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--background);
  box-shadow: var(--shadow);
  animation: bd-enter 150ms var(--ease);
}
.bd-pip { height: 100%; }
.bd-grip { position: absolute; right: 0; bottom: 0; width: 14px; height: 14px; cursor: nwse-resize; touch-action: none; }
.bd-grip::after { content: ''; position: absolute; right: 3px; bottom: 3px; width: 6px; height: 6px; border-right: 2px solid var(--muted-foreground); border-bottom: 2px solid var(--muted-foreground); opacity: 0; transition: opacity 150ms; }
.bd-float:hover .bd-grip::after { opacity: 0.5; }

@keyframes bd-enter { from { opacity: 0; transform: translateY(4px); } }
@keyframes bd-flash {
  0%, 35% { background: color-mix(in srgb, var(--info) 28%, transparent); }
  100% { background: transparent; }
}
@keyframes bd-pop { 0%, 35% { color: var(--info); font-weight: 600; } }
@keyframes bd-mark {
  0%, 40% { background: color-mix(in srgb, var(--info) 32%, transparent); }
  100% { background: transparent; }
}
@keyframes bd-shimmer { to { background-position: -200% 0; } }
@keyframes bd-spin { to { transform: rotate(360deg); } }
.bd .spin { animation: bd-spin 1s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .bd *, .bd-float { animation: none !important; transition: none !important; }
}
`;
