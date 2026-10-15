import { Block, GridSkeleton, PageHeadingSkeleton } from "@/app/_components/Skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeadingSkeleton />
      <Block className="mt-10 mb-5 h-8 w-64 rounded-xl" />
      <GridSkeleton count={3} />
    </main>
  );
}
