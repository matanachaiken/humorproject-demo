import { Block } from "@/app/_components/Skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Block className="h-9 w-48 rounded-xl" />
      <Block className="mt-8 h-20 w-20 rounded-full" />
      <Block className="mt-6 h-12 w-full" />
      <Block className="mt-4 h-12 w-full" />
    </main>
  );
}
