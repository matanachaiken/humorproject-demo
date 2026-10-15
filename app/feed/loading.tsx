import { Block, GridSkeleton, HeroSkeleton } from "@/app/_components/Skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <HeroSkeleton />
      <Block className="mt-10 mb-6 h-11 w-80 max-w-full rounded-full" />
      <GridSkeleton />
    </main>
  );
}
