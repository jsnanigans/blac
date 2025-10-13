import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Code, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/ui/Card';
import { guideStructure } from '@/core/guide/guideStructure';
import { DemoRegistry } from '@/core/utils/demoRegistry';
import { motion } from 'framer-motion';

export function GuideLanding() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            BlaC Learning Guide
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">
            Master state management with BlaC through interactive demos and
            real-world examples. Start with the basics and progress to advanced patterns.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex items-center justify-center gap-4 flex-wrap"
        >
          <Link
            to={`/guide/${guideStructure.sections[0].id}/${guideStructure.sections[0].demos[0]}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium"
          >
            <BookOpen className="h-5 w-5" />
            Start Learning
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/playground"
            className="inline-flex items-center gap-2 px-6 py-3 border rounded-lg hover:bg-accent/10 transition-colors"
          >
            <Code className="h-5 w-5" />
            Open Playground
          </Link>
        </motion.div>
      </section>

      {/* Quick Stats */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <StatCard
          label="Sections"
          value={guideStructure.sections.length}
          icon="📚"
        />
        <StatCard
          label="Interactive Demos"
          value={DemoRegistry.getAllDemos().length}
          icon="🎮"
        />
        <StatCard
          label="Difficulty Levels"
          value={3}
          icon="📈"
        />
        <StatCard
          label="Learning Path"
          value="Guided"
          icon="🗺️"
        />
      </motion.section>

      {/* Learning Path Sections */}
      <section className="space-y-8">
        <h2 className="text-2xl font-bold">Learning Path</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guideStructure.sections.map((section, index) => {
            const Icon = section.icon;
            const demos = section.demos
              .map(id => DemoRegistry.get(id))
              .filter(Boolean);

            const beginnerCount = demos.filter(d => d?.difficulty === 'beginner').length;
            const intermediateCount = demos.filter(d => d?.difficulty === 'intermediate').length;
            const advancedCount = demos.filter(d => d?.difficulty === 'advanced').length;

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.4 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <Link
                    to={`/guide/${section.id}/${section.demos[0]}`}
                    className="block p-6 h-full"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn('p-3 rounded-lg bg-gradient-to-br', getSectionGradient(section.id))}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {section.demos.length} demos
                      </span>
                    </div>

                    <h3 className="font-semibold text-lg mb-2">
                      {section.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {section.description}
                    </p>

                    {/* Difficulty breakdown */}
                    <div className="flex items-center gap-2 text-xs">
                      {beginnerCount > 0 && (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {beginnerCount} Beginner
                        </span>
                      )}
                      {intermediateCount > 0 && (
                        <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          {intermediateCount} Intermediate
                        </span>
                      )}
                      {advancedCount > 0 && (
                        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          {advancedCount} Advanced
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center text-sm text-accent-foreground">
                      Start Learning
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </Link>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Featured Demos */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Featured Demos</h2>
          <Sparkles className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FeaturedDemoCard
            sectionId="getting-started"
            demoId="hello-world"
            badge="Start Here"
            badgeColor="bg-green-500"
          />
          <FeaturedDemoCard
            sectionId="core-concepts"
            demoId="bloc-vs-cubit"
            badge="Popular"
            badgeColor="bg-purple-500"
          />
          <FeaturedDemoCard
            sectionId="patterns"
            demoId="todo"
            badge="Practical"
            badgeColor="bg-blue-500"
          />
          <FeaturedDemoCard
            sectionId="advanced"
            demoId="async"
            badge="Advanced"
            badgeColor="bg-orange-500"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

function FeaturedDemoCard({
  sectionId,
  demoId,
  badge,
  badgeColor
}: {
  sectionId: string;
  demoId: string;
  badge: string;
  badgeColor: string;
}) {
  const demo = DemoRegistry.get(demoId);
  if (!demo) return null;

  return (
    <Card>
      <Link
        to={`/guide/${sectionId}/${demoId}`}
        className="block p-6 hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold">{demo.title}</h3>
          <span className={cn('px-2 py-1 text-xs text-white rounded-full', badgeColor)}>
            {badge}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {demo.description}
        </p>
        <div className="flex items-center gap-2">
          {demo.concepts.slice(0, 2).map((concept) => (
            <span
              key={concept}
              className="px-2 py-1 text-xs bg-secondary rounded"
            >
              {concept}
            </span>
          ))}
          <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
        </div>
      </Link>
    </Card>
  );
}

function getSectionGradient(sectionId: string): string {
  const gradients: Record<string, string> = {
    'getting-started': 'from-blue-500 to-blue-600',
    'core-concepts': 'from-purple-500 to-purple-600',
    'patterns': 'from-green-500 to-green-600',
    'advanced': 'from-orange-500 to-orange-600',
    'plugins': 'from-cyan-500 to-cyan-600'
  };
  return gradients[sectionId] || 'from-gray-500 to-gray-600';
}