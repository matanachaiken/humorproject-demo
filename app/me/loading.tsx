import { Block, GridSkeleton } from "@/app/_components/Skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex items-center gap-5">
        <Block className="h-20 w-20 rounded-full" />
        <div className="flex-1">
          <Block className="h-9 w-56 rounded-xl" />
          <Block className="mt-2 h-4 w-40 rounded-lg" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Block key={i} className="h-20 rounded-3xl" />
        ))}
      </div>
      <Block className="mt-12 mb-5 h-8 w-40 rounded-xl" />
      <GridSkeleton count={3} />
    </main>
  );
}
