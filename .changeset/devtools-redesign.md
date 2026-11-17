---
'@blac/devtools-ui': patch
'@blac/devtools-connect': patch
---

Redesign the devtools UI: new theme and dark mode, one-line instance rows with last-change times, colored class monograms, collapsible class groups, `#n` badges for instances sharing a key, inspector views (State, Changes, History), a log that folds bursts and starts with the instances present at connect, live updates without holds, keyboard navigation, and a narrow single-pane layout.

The devtools now list only live instances: disposed ones are dropped at once (the agent no longer keeps them, and `maxDisposed` is gone), instances are cleared when the page goes away, and the log is cleared when a new page connects.
