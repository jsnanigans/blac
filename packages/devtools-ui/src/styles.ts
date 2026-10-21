export const CSS = `
.bd {
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
}
.bd[data-theme='dark'] {
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
}
@media (prefers-color-scheme: dark) {
  .bd[data-theme='auto'] {
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
  }
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
  padding: 6px 10px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
}
.bd .tab.active { border-bottom-color: var(--accent); font-weight: 600; }
.bd .status { margin-left: auto; display: flex; align-items: center; gap: 6px; color: var(--muted); }
.bd .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
.bd .dot.connected { background: var(--added); }
.bd .dot.connecting { background: var(--changed); }
.bd .dot.closed { background: var(--removed); }
.bd .split { display: flex; flex: 1; min-height: 0; }
.bd .list { display: flex; flex-direction: column; width: 40%; min-width: 200px; border-right: 1px solid var(--border); }
.bd .list.wide { width: 100%; border: 0; }
.bd .inspector { flex: 1; padding: 8px 12px; }
.bd .scroll { flex: 1; min-height: 0; overflow: auto; }
.bd .toolbar { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-bottom: 1px solid var(--border); }
.bd .toolbar input[type='search'] { flex: 1; min-width: 0; padding: 3px 6px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg); }
.bd .toolbar label { display: flex; align-items: center; gap: 4px; white-space: nowrap; color: var(--muted); }
.bd .toolbar button { padding: 3px 8px; border: 1px solid var(--border); border-radius: 3px; background: var(--bg-alt); }
.bd .toolbar button:disabled { opacity: 0.5; cursor: default; }
.bd h2 { margin: 0 8px 0 0; display: inline; font-size: 14px; }
.bd h3 { margin: 0; padding: 6px 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
.bd .inspector h3 { padding: 12px 0 4px; }
.bd .item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 3px 8px; border: 0; background: none; text-align: left; }
.bd .item:hover { background: var(--bg-alt); }
.bd .item.selected { background: var(--sel); }
.bd .item.off { opacity: 0.5; }
.bd .item .name { font-family: ui-monospace, monospace; }
.bd .count { margin-left: auto; padding: 0 6px; border-radius: 8px; background: var(--bg-alt); font-family: ui-monospace, monospace; }
.bd .count.flash { animation: bd-flash 0.8s ease-out; }
@keyframes bd-flash { from { background: var(--flash); } }
.bd .muted { color: var(--muted); }
.bd .empty { margin: 0; padding: 16px; color: var(--muted); text-align: center; }
.bd .chips { display: inline-flex; gap: 4px; align-items: center; }
.bd .chip { padding: 0 5px; border-radius: 3px; background: var(--bg-alt); border: 1px solid var(--border); font-family: ui-monospace, monospace; }
.bd .badge { padding: 0 5px; border-radius: 3px; border: 1px solid currentColor; font-size: 10px; }
.bd .badge.created, .bd .badge.added { color: var(--added); }
.bd .badge.disposed, .bd .badge.removed { color: var(--removed); }
.bd .badge.changed { color: var(--changed); }
.bd .changes, .bd .history { margin: 0; padding: 0; list-style: none; }
.bd .changes li { display: flex; gap: 6px; align-items: baseline; padding: 2px 0; font-family: ui-monospace, monospace; }
.bd .tree { font-family: ui-monospace, monospace; }
.bd .tree .node { display: flex; gap: 4px; padding: 0; border: 0; background: none; text-align: left; }
.bd .tree .leaf { padding-left: 14px; }
.bd .tree .kids { padding-left: 14px; }
.bd .tree .caret { width: 10px; color: var(--muted); }
.bd .key { color: var(--fg); font-weight: 600; }
.bd .val.string { color: var(--string); }
.bd .val.number, .bd .val.boolean { color: var(--number); }
.bd .val.special { color: var(--special); }
.bd .tree .added { background: color-mix(in srgb, var(--added) 20%, transparent); }
.bd .tree .removed { background: color-mix(in srgb, var(--removed) 20%, transparent); }
.bd .tree .changed { background: color-mix(in srgb, var(--changed) 25%, transparent); }
.bd-dock { position: relative; display: flex; flex-direction: column; border-top: 1px solid #31353d; box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.2); }
.bd-resize { position: absolute; top: -3px; left: 0; right: 0; height: 6px; cursor: ns-resize; z-index: 1; touch-action: none; }
.bd-close { position: absolute; top: 3px; right: 6px; z-index: 1; border: 0; background: none; font-size: 16px; line-height: 1; color: #8b929c; }
`;
