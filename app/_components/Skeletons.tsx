// Placeholder shapes shown instantly while a page's data loads.

export function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-2 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="aspect-square w-full animate-pulse bg-surface-2" />
      <div className="flex flex-col gap-2 p-4">
        <Block className="h-5 w-4/5 rounded-lg" />
        <Block className="h-4 w-1/2 rounded-lg" />
        <Block className="mt-2 h-10 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="rounded-[2rem] bg-[#1c1714] p-6 sm:p-10">
      <div className="h-6 w-56 animate-pulse rounded-full bg-white/10" />
      <div className="mt-5 h-12 w-3/4 animate-pulse rounded-2xl bg-white/10 sm:h-16" />
      <div className="mt-10 h-14 w-full animate-pulse rounded-full bg-white/10" />
    </div>
  );
}

export function PageHeadingSkeleton() {
  return (
    <div className="mb-8">
      <Block className="h-4 w-28 rounded-full" />
      <Block className="mt-3 h-11 w-72 max-w-full" />
      <Block className="mt-3 h-5 w-96 max-w-full rounded-lg" />
    </div>
  );
}
