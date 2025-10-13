import React from 'react';
import { GuideSimpleLayout } from '@/layouts/GuideLayout';
import { GuideLanding } from '@/components/guide/GuideLanding';

export function GuidePage() {
  return (
    <GuideSimpleLayout>
      <GuideLanding />
    </GuideSimpleLayout>
  );
}