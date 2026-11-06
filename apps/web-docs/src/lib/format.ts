export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Minutes at ~220 words per minute, ignoring imports and code fences. */
export function readingMinutes(md: string): number {
  const prose = md.replace(/^import .*$/gm, '').replace(/```[\s\S]*?```/g, '');
  return Math.max(
    1,
    Math.round(prose.split(/\s+/).filter(Boolean).length / 220),
  );
}

/** Chapter titles carry `<em>` for the lit word; strip it where only text fits. */
export const plain = (html: string) => html.replace(/<[^>]+>/g, '');
