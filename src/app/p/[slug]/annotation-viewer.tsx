'use client';

import { PrototypeAnnotations } from '@/components/annotations/prototype-annotations';

export default function AnnotationViewer({
  projectId,
  versionId,
  iframeSrc,
  initialPanelOpen,
}: {
  projectId: string;
  versionId: string;
  iframeSrc: string;
  initialPanelOpen: boolean;
}) {
  return (
    <main className="h-screen w-screen overflow-hidden bg-gray-50">
      <PrototypeAnnotations
        projectId={projectId}
        versionId={versionId}
        iframeSrc={iframeSrc}
        mode="view"
        deviceClassName="h-full w-full rounded-none"
        initialPanelOpen={initialPanelOpen}
      />
    </main>
  );
}
