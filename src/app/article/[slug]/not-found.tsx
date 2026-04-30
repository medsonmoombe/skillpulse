// src/app/article/[slug]/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-extrabold text-indigo-600 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Article Not Found</h2>
      <p className="text-slate-500 mb-8 text-center">The article you are looking for does not exist or has been removed.</p>
      <Link href="/">
        <Button className="bg-indigo-600 hover:bg-indigo-700">Back to Home Feed</Button>
      </Link>
    </div>
  );
}