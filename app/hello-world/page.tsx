import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hello World",
};

export default function HelloWorld() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center px-16 py-32">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Hello World
        </h1>
      </main>
    </div>
  );
}
