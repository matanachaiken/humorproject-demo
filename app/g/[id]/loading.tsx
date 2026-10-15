import { Block } from "@/app/_components/Skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Block className="mb-6 h-5 w-32 rounded-lg" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Block className="aspect-square w-full rounded-[2rem]" />
        <div className="flex flex-col gap-4">
          <Block className="h-4 w-48 rounded-lg" />
          <Block className="h-10 w-full rounded-xl" />
          <Block className="h-5 w-2/3 rounded-lg" />
          <Block className="mt-2 h-12 w-56 rounded-full" />
        </div>
      </div>
    </main>
  );
}
