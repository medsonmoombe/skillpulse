import { Skeleton } from "@/components/ui/skeleton";

export default function ArticleLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-50 h-14 border-b bg-white/90" />
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <Skeleton className="h-72 w-full rounded-3xl" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-2xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="space-y-3 pt-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" style={{ width: `${85 + Math.random() * 15}%` }} />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-56 w-full rounded-3xl" />
            <Skeleton className="h-28 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
