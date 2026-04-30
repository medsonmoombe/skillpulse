// src/app/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar Skeleton */}
      <nav className="border-b bg-white h-16 flex items-center justify-between px-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </nav>

      {/* Content Skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-6 w-96 mb-8" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card Skeleton */}
          <div className="md:col-span-1 border rounded-lg p-6 space-y-4">
            <Skeleton className="h-6 w-24" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-full mt-4" />
          </div>

          {/* Quick Actions Skeleton */}
          <div className="md:col-span-2 border rounded-lg p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}