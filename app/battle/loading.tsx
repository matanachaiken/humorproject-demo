import { CardSkeleton, PageHeadingSkeleton } from "@/app/_components/Skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeadingSkeleton />
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </main>
  );
}
