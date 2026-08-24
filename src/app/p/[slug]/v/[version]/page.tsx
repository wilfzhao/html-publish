import PublicPreviewPage from '../../page';

export default async function PinnedVersionPreviewPage({
  params,
}: {
  params: Promise<{ slug: string; version: string }>;
}) {
  const { slug, version } = await params;
  return (
    <PublicPreviewPage
      params={Promise.resolve({ slug })}
      searchParams={Promise.resolve({ v: version })}
    />
  );
}

