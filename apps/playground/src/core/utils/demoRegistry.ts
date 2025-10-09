import { ComponentType } from 'react';

export type DemoCategory =
  | '01-basics'
  | '02-patterns'
  | '03-advanced'
  | '04-plugins'
  | '05-testing'
  | '06-real-world';

export type DemoDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface DemoCode {
  demo: string;
  bloc?: string;
  usage?: string;
  test?: string;
}

export interface DemoTest {
  name: string;
  run: () => Promise<boolean> | boolean;
  description?: string;
}

export interface DemoBenchmark {
  name: string;
  run: () => Promise<number> | number;
  baseline?: number;
  unit?: string;
}

export interface Demo {
  id: string;
  category: DemoCategory;
  title: string;
  description: string;
  difficulty: DemoDifficulty;
  tags: string[];
  concepts: string[];
  component: ComponentType;
  code: DemoCode;
  tests?: DemoTest[];
  benchmarks?: DemoBenchmark[];
  documentation?: string;
  relatedDemos?: string[];
  prerequisites?: string[];
}

class DemoRegistryClass {
  private demos = new Map<string, Demo>();
  private categories = new Map<DemoCategory, Demo[]>();

  register(demo: Demo) {
    this.demos.set(demo.id, demo);

    const categoryDemos = this.categories.get(demo.category) || [];
    categoryDemos.push(demo);
    this.categories.set(demo.category, categoryDemos);
  }

  get(id: string): Demo | undefined {
    return this.demos.get(id);
  }

  getByCategory(category: DemoCategory): Demo[] {
    return this.categories.get(category) || [];
  }

  getAllCategories(): DemoCategory[] {
    return Array.from(this.categories.keys()).sort();
  }

  getAllDemos(): Demo[] {
    return Array.from(this.demos.values());
  }

  search(query: string): Demo[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllDemos().filter(
      (demo) =>
        demo.title.toLowerCase().includes(lowerQuery) ||
        demo.description.toLowerCase().includes(lowerQuery) ||
        demo.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        demo.concepts.some((concept) =>
          concept.toLowerCase().includes(lowerQuery),
        ),
    );
  }

  getByTag(tag: string): Demo[] {
    return this.getAllDemos().filter((demo) => demo.tags.includes(tag));
  }

  getByDifficulty(difficulty: DemoDifficulty): Demo[] {
    return this.getAllDemos().filter((demo) => demo.difficulty === difficulty);
  }

  getRelated(demoId: string): Demo[] {
    const demo = this.get(demoId);
    if (!demo) return [];

    const related: Demo[] = [];

    // Add explicitly related demos
    if (demo.relatedDemos) {
      demo.relatedDemos.forEach((id) => {
        const relatedDemo = this.get(id);
        if (relatedDemo) related.push(relatedDemo);
      });
    }

    // Add demos with similar tags
    const similarDemos = this.getAllDemos().filter(
      (d) => d.id !== demoId && d.tags.some((tag) => demo.tags.includes(tag)),
    );

    // Combine and deduplicate
    const uniqueDemos = new Map<string, Demo>();
    [...related, ...similarDemos].forEach((d) => uniqueDemos.set(d.id, d));

    return Array.from(uniqueDemos.values()).slice(0, 5);
  }
}

export const DemoRegistry = new DemoRegistryClass();
