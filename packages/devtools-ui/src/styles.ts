const DARK = `
  --bg: #16181d;
  --bg-alt: #1e2127;
  --fg: #d7dae0;
  --muted: #8b929c;
  --border: #31353d;
  --accent: #58a6ff;
  --sel: #1f3350;
  --added: #56d364;
  --removed: #ff7b72;
  --changed: #e3b341;
  --flash: #5a4a12;
  --string: #a5d6ff;
  --number: #79c0ff;
  --special: #d2a8ff;
`;

export const CSS = `
.bd, .bd-float, .bd-pip {
  --bg: #ffffff;
  --bg-alt: #f4f5f7;
  --fg: #1f2328;
  --muted: #6e7781;
  --border: #d8dde3;
  --accent: #0969da;
  --sel: #ddebfb;
  --added: #1a7f37;
  --removed: #cf222e;
  --changed: #9a6700;
  --flash: #fff1b8;
  --string: #0a3069;
  --number: #0550ae;
  --special: #8250df;
  --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.bd[data-theme='dark'], .bd-float[data-theme='dark'], .bd-pip[data-theme='dark'] {${DARK}}
@media (prefers-color-scheme: dark) {
  .bd[data-theme='auto'], .bd-float[data-theme='auto'], .bd-pip[data-theme='auto'] {${DARK}}
}
.bd, .bd * { box-sizing: border-box; }
.bd {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg);
  color: var(--fg);
  font: 12px/1.4 ui-sans-serif, system-ui, sans-serif;
}
.bd button, .bd input { font: inherit; color: inherit; }
.bd button { cursor: pointer; }
.bd :focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.bd nav {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 32px 0 8px;
  background: var(--bg-alt);
  border-bottom: 1px solid var(--border);
}
.bd .tab {
  display: flex;
  gap: 6px;
  padding: 6px 10px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
}
.bd .tab.active { border-bottom-color: var(--accent); font-weight: 600; }
.bd .tab .muted { font-weight: 400; font-variant-numeric: tabular-nums; }
.bd .status { margin-left: auto; display: flex; align-items: center; gap: 6px; color: var(--muted); }
.bd .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
.bd .dot.connected { background: var(--added); }
.bd .dot.connecting { background: var(--changed); }
.bd .dot.closed { background: var(--removed); }
.bd[data-status='connecting'] .split, .bd[data-status='connecting'] .log { opacity: 0.55; }
.bd .split { display: flex; flex: 1; min-height: 0; }
.bd .list { display: flex; flex-direction: column; width: 40%; min-width: 200px; max-width: 420px; border-right: 1px solid var(--border); }
.bd .list.wide { width: 100%; max-width: none; border: 0; }
.bd .inspector { flex: 1; min-width: 0; padding: 8px 12px; }
.bd .scroll { flex: 1; min-height: 0; overflow: auto; }
.bd .toolbar { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-bottom: 1px solid var(--border); }
.bd .toolbar input[type='search'] { flex: 1; min-width: 0; padding: 3px 6px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); }
.bd .toolbar label { display: flex; align-items: center; gap: 4px; white-space: nowrap; color: var(--muted); }
.bd .toolbar button { padding: 3px 8px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg-alt); }
.bd .toolbar button:disabled { opacity: 0.5; cursor: default; }
.bd h2 { margin: 0 8px 0 0; display: inline; font-size: 14px; }
.bd h3 { margin: 0; padding: 6px 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
.bd h3 .ver { text-transform: none; }
.bd .list h3 { position: sticky; top: 0; background: var(--bg); }
.bd .inspector h3 { padding: 12px 0 4px; }
.bd .inspector header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; }
.bd .inspector header h2 { margin: 0; }
.bd .inspector header > div { flex-basis: 100%; }
.bd .link { margin-left: 8px; padding: 0; border: 0; background: none; color: var(--accent); font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; }
.bd .item { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; padding: 3px 8px; border: 0; background: none; text-align: left; white-space: nowrap; }
.bd .item > * { overflow: hidden; text-overflow: ellipsis; }
.bd .item:hover { background: var(--bg-alt); }
.bd .item.selected { background: var(--sel); box-shadow: inset 2px 0 var(--accent); }
.bd .item.off { opacity: 0.5; }
.bd .name { font-family: var(--mono); }
.bd .time { flex: none; font-variant-numeric: tabular-nums; }
.bd .count { flex: none; margin-left: auto; padding: 0 6px; border-radius: 8px; background: var(--bg-alt); font-family: var(--mono); }
.bd .count.flash { animation: bd-flash 0.8s ease-out; }
@keyframes bd-flash { from { background: var(--flash); } }
.bd .muted { color: var(--muted); }
.bd .empty { margin: 0; padding: 16px; color: var(--muted); text-align: center; }
.bd .chips { display: inline-flex; gap: 4px; align-items: center; }
.bd .chip { padding: 0 5px; border-radius: 3px; background: var(--bg-alt); border: 1px solid var(--border); font-family: var(--mono); }
.bd .badge { flex: none; padding: 0 5px; border-radius: 3px; border: 1px solid currentColor; font-size: 10px; text-align: center; }
.bd .item .badge, .bd .changes .badge { min-width: 56px; }
.bd .badge.created, .bd .badge.added { color: var(--added); }
.bd .badge.disposed, .bd .badge.removed { color: var(--removed); }
.bd .badge.changed { color: var(--changed); }
.bd .changes, .bd .history { margin: 0; padding: 0; list-style: none; }
.bd .changes li { display: flex; gap: 6px; align-items: baseline; padding: 2px 0; font-family: var(--mono); }
.bd .history .item { padding-left: 4px; }
.bd .tree { font-family: var(--mono); }
.bd .tree .node { display: flex; gap: 4px; padding: 0 4px 0 0; border: 0; background: none; text-align: left; }
.bd .tree .leaf { width: fit-content; padding: 0 4px 0 14px; }
.bd .tree .kids { padding-left: 14px; }
.bd .tree .caret { width: 10px; color: var(--muted); }
.bd .tree .inside .caret { color: var(--changed); }
.bd .key { color: var(--fg); font-weight: 600; }
.bd .val.string { color: var(--string); }
.bd .val.number, .bd .val.boolean { color: var(--number); }
.bd .val.special { color: var(--special); }
.bd .tree .added, .bd .tree .removed, .bd .tree .changed { border-radius: 2px; }
.bd .tree .added { background: color-mix(in srgb, var(--added) 20%, transparent); }
.bd .tree .removed { background: color-mix(in srgb, var(--removed) 20%, transparent); }
.bd .tree .changed { background: color-mix(in srgb, var(--changed) 25%, transparent); }
.bd-float, .bd-float * { box-sizing: border-box; }
.bd-float { position: fixed; pointer-events: auto; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3); font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; }
.bd-bar { display: flex; align-items: center; gap: 4px; flex: none; height: 26px; padding: 0 6px 0 10px; background: var(--bg-alt); border-bottom: 1px solid var(--border); cursor: grab; user-select: none; touch-action: none; }
.bd-bar:active { cursor: grabbing; }
.bd-title { flex: 1; font-weight: 600; color: var(--muted); }
.bd-bar button { border: 0; background: none; padding: 2px 4px; font-size: 14px; line-height: 1; color: var(--muted); cursor: pointer; }
.bd-bar button:hover { color: var(--fg); }
.bd-body { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.bd-pip { height: 100%; }
.bd-grip { position: absolute; right: 0; bottom: 0; width: 14px; height: 14px; cursor: nwse-resize; touch-action: none; }
.bd-grip:hover, .bd-grip:active { background: linear-gradient(135deg, transparent 50%, color-mix(in srgb, var(--accent) 60%, transparent) 50%); }
`;
