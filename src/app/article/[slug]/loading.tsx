// src/app/article/[slug]/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ArticleLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Skeleton className="h-6 w-24 mb-4" /> {/* Topic Badge */}
        <Skeleton className="h-12 w-full mb-6" /> {/* Title */}
        
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="h-12 w-12 rounded-full" /> {/* Avatar */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" /> {/* Author Name */}
            <Skeleton className="h-4 w-48" /> {/* Date/Role */}
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </main>
  );
}