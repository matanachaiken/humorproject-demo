import { Block, PageHeadingSkeleton } from "@/app/_components/Skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeadingSkeleton />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Block key={i} className="h-56 rounded-3xl" />
        ))}
      </div>
    </main>
  );
}
