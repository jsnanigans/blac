/**
 * PathTrie: Efficient trie structure for filtering leaf paths
 *
 * Replaces O(n²) nested loops with O(n) tree traversal.
 * Used by BlacAdapter.filterLeafPaths to optimize dependency tracking.
 *
 * Performance:
 * - Build: O(n × avg_path_depth)
 * - Query leafs: O(n)
 * - Memory: O(total_segments)
 *
 * Example:
 * ```
 * const trie = new PathTrie();
 * trie.insert('user');
 * trie.insert('user.profile');
 * trie.insert('user.profile.name');
 * const leafs = trie.getLeafPaths(); // Set(['user.profile.name'])
 * ```
 */
export class PathTrie {
  children = new Map<string, PathTrie>();
  fullPath = '';
  isTerminal = false; // True if a path explicitly ends at this node

  /**
   * Insert a path into the trie
   * @param path Dot-notation path (e.g., 'user.profile.name')
   */
  insert(path: string): void {
    const segments = path.split('.');
    let node: PathTrie = this;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      // Get or create child node
      if (!node.children.has(segment)) {
        node.children.set(segment, new PathTrie());
      }
      node = node.children.get(segment)!;

      // Update full path
      node.fullPath = segments.slice(0, i + 1).join('.');
    }

    // Mark this node as a terminal (path explicitly inserted)
    node.isTerminal = true;
  }

  /**
   * Get all leaf paths (paths with no children OR terminal paths)
   * Complexity: O(n) where n is number of paths
   * @returns Set of leaf paths
   */
  getLeafPaths(): Set<string> {
    const leafs = new Set<string>();
    this.collectLeafs(leafs);
    return leafs;
  }

  /**
   * Recursively collect leaf paths
   * A node is a leaf ONLY if it has no children
   * (Intermediate terminal paths are filtered out)
   */
  private collectLeafs(leafs: Set<string>): void {
    // Base case: this is a leaf node (no children)
    if (this.children.size === 0 && this.fullPath) {
      leafs.add(this.fullPath);
      return;
    }

    // If this node has children, recurse into them
    // (don't add this path even if it's terminal)
    for (const child of this.children.values()) {
      child.collectLeafs(leafs);
    }
  }

  /**
   * Check if a path exists in the trie
   */
  has(path: string): boolean {
    const segments = path.split('.');
    let node: PathTrie = this;

    for (const segment of segments) {
      if (!node.children.has(segment)) {
        return false;
      }
      node = node.children.get(segment)!;
    }

    return node.isTerminal;
  }

  /**
   * Clear the trie
   */
  clear(): void {
    this.children.clear();
    this.fullPath = '';
    this.isTerminal = false;
  }

  /**
   * Get size (number of paths in trie)
   */
  get size(): number {
    let count = this.isTerminal ? 1 : 0;
    for (const child of this.children.values()) {
      count += child.size;
    }
    return count;
  }
}
