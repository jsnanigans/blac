import { createFileRoute } from '@tanstack/react-router'
import { BlacFeatureDemo } from '../../components/BlacFeatures/BlacFeatureDemo'

export const Route = createFileRoute('/demo/blac-features')({
  component: BlacFeaturesRoute,
})

function BlacFeaturesRoute() {
  return (
    <div className="container mx-auto px-4 py-8">
      <BlacFeatureDemo />
    </div>
  )
}
