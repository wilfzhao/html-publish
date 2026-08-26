import PublicPreviewPage from '../../page';

export default async function PinnedVersionPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; version: string }>;
  searchParams: Promise<{ ui?: string }>;
}) {
  const { slug, version } = await params;
  const { ui } = await searchParams;
  return (
    <PublicPreviewPage
      params={Promise.resolve({ slug })}
      searchParams={Promise.resolve({ v: version, ui })}
    />
  );
}
