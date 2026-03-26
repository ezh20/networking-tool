import { Suspense } from 'react';
import { CampaignsClient } from './client';

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading...</div>}>
      <CampaignsClient />
    </Suspense>
  );
}
