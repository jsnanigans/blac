export function extractChanges(previous: any, current: any): any {
  if (previous === current) return undefined;

  if (previous == null || current == null) return current;

  if (typeof previous !== typeof current) return current;

  if (typeof current !== 'object') {
    return previous !== current ? current : undefined;
  }

  if (Array.isArray(current)) {
    if (!Array.isArray(previous) || previous.length !== current.length) {
      return current;
    }

    const changes: any[] = [];
    let hasChanges = false;

    for (let i = 0; i < current.length; i++) {
      const itemChange = extractChanges(previous[i], current[i]);
      if (itemChange !== undefined) {
        hasChanges = true;
        changes[i] = itemChange;
      }
    }

    return hasChanges ? current : undefined;
  }

  const changes: Record<string, any> = {};
  let hasChanges = false;

  for (const key in current) {
    if (!(key in previous)) {
      changes[key] = current[key];
      hasChanges = true;
    } else {
      const change = extractChanges(previous[key], current[key]);
      if (change !== undefined) {
        changes[key] = change;
        hasChanges = true;
      }
    }
  }

  for (const key in previous) {
    if (!(key in current)) {
      changes[key] = undefined;
      hasChanges = true;
    }
  }

  return hasChanges ? changes : undefined;
}
