export function instanceKey(id: string): string {
  const i = id.indexOf(':');
  return i !== -1 ? id.slice(i + 1) : id;
}
