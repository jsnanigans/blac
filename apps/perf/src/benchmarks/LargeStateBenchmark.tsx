import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useState } from 'react';
import { PerformanceMetrics, BenchmarkResult } from '../utils/PerformanceMetrics';

/**
 * Test performance with large, deeply nested state trees
 */

interface TreeNode {
  id: string;
  value: number;
  children?: TreeNode[];
  metadata?: {
    created: number;
    modified: number;
    tags: string[];
  };
}

function generateTree(depth: number, breadth: number, prefix = ''): TreeNode {
  const node: TreeNode = {
    id: prefix || 'root',
    value: Math.random() * 1000,
    metadata: {
      created: Date.now(),
      modified: Date.now(),
      tags: ['tag1', 'tag2', 'tag3'],
    },
  };

  if (depth > 0) {
    node.children = Array.from({ length: breadth }, (_, i) =>
      generateTree(depth - 1, breadth, `${prefix}-${i}`)
    );
  }

  return node;
}

function countNodes(node: TreeNode): number {
  if (!node.children) return 1;
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

function updateNodeValue(node: TreeNode, targetId: string, newValue: number): TreeNode {
  if (node.id === targetId) {
    return {
      ...node,
      value: newValue,
      metadata: node.metadata
        ? { ...node.metadata, modified: Date.now() }
        : undefined,
    };
  }

  if (node.children) {
    return {
      ...node,
      children: node.children.map((child) => updateNodeValue(child, targetId, newValue)),
    };
  }

  return node;
}

function findNode(node: TreeNode, targetId: string): TreeNode | null {
  if (node.id === targetId) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

interface TreeStateCubitProps {
  depth: number;
  breadth: number;
}

class TreeStateCubit extends Cubit<TreeNode> {
  private depth: number;
  private breadth: number;

  constructor(props: TreeStateCubitProps) {
    super(generateTree(props.depth, props.breadth));
    this.depth = props.depth;
    this.breadth = props.breadth;
  }

  updateNode = (id: string, value: number) => {
    const updated = updateNodeValue(this.state, id, value);
    this.emit(updated);
  };

  regenerate = (depth: number, breadth: number) => {
    const tree = generateTree(depth, breadth);
    this.emit(tree);
  };
}

const TreeNodeDisplay: React.FC<{
  node: TreeNode;
  depth: number;
  onUpdate: (id: string) => void;
}> = ({ node, depth, onUpdate }) => {
  const [collapsed, setCollapsed] = useState(depth > 2);

  return (
    <div style={{ marginLeft: `${depth * 20}px`, marginTop: '4px' }}>
      <div
        style={{
          padding: '4px 8px',
          border: '1px solid #ddd',
          background: '#f9f9f9',
          display: 'inline-block',
        }}
      >
        {node.children && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              marginRight: '8px',
              padding: '2px 6px',
              fontSize: '12px',
            }}
          >
            {collapsed ? '+' : '-'}
          </button>
        )}
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {node.id}: {node.value.toFixed(2)}
        </span>
        <button
          onClick={() => onUpdate(node.id)}
          style={{ marginLeft: '8px', padding: '2px 6px', fontSize: '11px' }}
        >
          Update
        </button>
      </div>
      {!collapsed && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNodeDisplay
              key={child.id}
              node={child}
              depth={depth + 1}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LargeStateBenchmark: React.FC = () => {
  const [depth, setDepth] = useState(3);
  const [breadth, setBreadth] = useState(3);
  const [results, setResults] = useState<BenchmarkResult[]>([]);

  const [tree, cubit] = useBloc(TreeStateCubit, {
    staticProps: { depth, breadth },
  });

  const { updateNode, regenerate } = cubit;

  const nodeCount = countNodes(tree);

  const handleRegenerate = () => {
    const result = PerformanceMetrics.measure('Generate Tree', () => {
      regenerate(depth, breadth);
    });
    setResults([result.metrics]);
  };

  const handleUpdate = (id: string) => {
    const result = PerformanceMetrics.measure(`Update Node ${id}`, () => {
      updateNode(id, Math.random() * 1000);
    });
    setResults((prev) => [...prev, result.metrics]);
  };

  const runUpdateBenchmark = () => {
    PerformanceMetrics.clearResults();

    // Find a leaf node to update
    const leafId = `root-0-0-0`;
    const node = findNode(tree, leafId);

    if (node) {
      const result = PerformanceMetrics.benchmark(
        'Update Deep Leaf Node (100x)',
        () => {
          updateNode(leafId, Math.random() * 1000);
        },
        100
      );
      setResults([result]);
    }
  };

  const runFullRegenBenchmark = () => {
    PerformanceMetrics.clearResults();

    const result = PerformanceMetrics.benchmark(
      'Full Tree Regeneration (10x)',
      () => {
        regenerate(depth, breadth);
      },
      10
    );
    setResults([result]);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Large State Tree Performance</h2>
      <p>
        Tests performance with large, deeply nested state trees. Measures state update
        propagation and immutable update performance.
      </p>

      <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
        <h3>Tree Configuration</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '20px' }}>
            Depth:{' '}
            <input
              type="number"
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value, 10))}
              min="1"
              max="6"
              style={{ width: '60px', marginLeft: '5px' }}
            />
          </label>
          <label>
            Breadth:{' '}
            <input
              type="number"
              value={breadth}
              onChange={(e) => setBreadth(parseInt(e.target.value, 10))}
              min="1"
              max="10"
              style={{ width: '60px', marginLeft: '5px' }}
            />
          </label>
        </div>
        <div style={{ fontSize: '14px' }}>
          <strong>Total Nodes: {nodeCount}</strong>
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Note: Large trees (depth &gt; 4, breadth &gt; 5) may impact performance
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleRegenerate}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Regenerate Tree
        </button>
        <button
          onClick={runUpdateBenchmark}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Benchmark Deep Update (100x)
        </button>
        <button onClick={runFullRegenBenchmark} style={{ padding: '10px 20px' }}>
          Benchmark Full Regen (10x)
        </button>
      </div>

      <div
        style={{
          marginBottom: '20px',
          maxHeight: '400px',
          overflow: 'auto',
          border: '1px solid #ddd',
          padding: '10px',
          background: 'white',
        }}
      >
        <h3>Tree Visualization</h3>
        <TreeNodeDisplay node={tree} depth={0} onUpdate={handleUpdate} />
      </div>

      {results.length > 0 && (
        <div>
          <h3>Results</h3>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #ddd',
            }}
          >
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Operation</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Duration</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>
                  Avg (if batched)
                </th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Memory Delta</th>
              </tr>
            </thead>
            <tbody>
              {results.slice(-10).map((result, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {result.name}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {PerformanceMetrics.formatDuration(result.duration)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {result.avgDuration
                      ? PerformanceMetrics.formatDuration(result.avgDuration)
                      : '-'}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {result.memoryDelta
                      ? PerformanceMetrics.formatBytes(result.memoryDelta)
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length > 10 && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Showing last 10 results
            </div>
          )}
        </div>
      )}
    </div>
  );
};
