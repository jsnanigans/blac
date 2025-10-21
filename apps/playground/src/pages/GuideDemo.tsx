import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import { GuideLayout } from '@/layouts/GuideLayout';
import { DemoRegistry } from '@/core/utils/demoRegistry';
import { getSection } from '@/core/guide/guideStructure';
import { GuideArticle } from '@/components/guide/GuideArticle';
import { mdxComponents } from '@/components/guide/MdxComponents';

const guideArticles = import.meta.glob('../content/guide/**/*.mdx', {
  eager: true,
});

function getArticlePath(sectionId: string, demoId: string) {
  const direct = `../content/guide/${sectionId}/${demoId}.mdx`;
  if (direct in guideArticles) {
    return direct;
  }

  const indexPath = `../content/guide/${sectionId}/${demoId}/index.mdx`;
  if (indexPath in guideArticles) {
    return indexPath;
  }

  return null;
}

export function GuideDemo() {
  const { sectionId, demoId } = useParams<{
    sectionId: string;
    demoId: string;
  }>();

  // Validate section and demo exist
  const section = sectionId ? getSection(sectionId) : null;
  const demo = demoId ? DemoRegistry.get(demoId) : null;

  // Check if demo belongs to section
  const isDemoInSection = section && section.demos.includes(demoId || '');

  if (!section || !demo || !isDemoInSection) {
    // Redirect to guide landing if invalid
    return <Navigate to="/guide" replace />;
  }

  const articlePath =
    sectionId && demoId ? getArticlePath(sectionId, demoId) : null;

  // Get the MDX module
  const mdxModule = articlePath ? (guideArticles[articlePath] as any) : null;
  const MDXContent = mdxModule?.default;
  const mdxDemoId = mdxModule?.demoId;
  const mdxSectionId = mdxModule?.sectionId;

  return (
    <GuideLayout
      currentSection={sectionId}
      currentDemo={demoId}
      showNavigation={true}
    >
      {MDXContent ? (
        <MDXProvider components={mdxComponents}>
          <GuideArticle
            demoId={mdxDemoId || demoId}
            sectionId={mdxSectionId || sectionId}
          >
            <MDXContent />
          </GuideArticle>
        </MDXProvider>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-8 shadow-subtle">
          <h2 className="text-lg font-semibold text-foreground">
            Guide article coming soon
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We don&apos;t have MDX content for this demo yet. In the meantime,
            open the playground demo to explore the code.
          </p>
        </div>
      )}
    </GuideLayout>
  );
}
