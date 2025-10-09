const fs = require('fs');
const path = './src/demos/02-patterns/event-design/EventDesign.test.ts';

// Read the file
let content = fs.readFileSync(path, 'utf8');

// Make all test functions async
content = content.replace(/it\('([^']+)',\s*\(\)\s*=>\s*{/g, "it('$1', async () => {");
content = content.replace(/it\("([^"]+)",\s*\(\)\s*=>\s*{/g, 'it("$1", async () => {');

// Add await before bloc method calls (public API)
const methods = ['incrementBy', 'reset', 'updateData', 'loadData', 'loginUser', 'setError', 'doIncrement', 'sendGenericData', 'sendMutableState', 'updateOrReset'];
methods.forEach(method => {
  // Match method calls that aren't already awaited
  const regex = new RegExp(`([^a])bloc\\.${method}\\(`, 'g');
  content = content.replace(regex, `$1await bloc.${method}(`);
  // Handle line start
  const regex2 = new RegExp(`^(\\s+)bloc\\.${method}\\(`, 'gm');
  content = content.replace(regex2, `$1await bloc.${method}(`);
});

// Add await before bloc.add() calls
content = content.replace(/([^a])bloc\.add\(/g, '$1await bloc.add(');
content = content.replace(/^(\s+)bloc\.add\(/gm, '$1await bloc.add(');

// Write back
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed event tests!');
