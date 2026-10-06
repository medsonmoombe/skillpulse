export const dynamic = "force-dynamic";

import { SignUpButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";

// Replica of the real page structure: async server component + Navbar + hero CTA.
export default async function ClerkAsyncReplicaPage() {
  await Promise.resolve(null);
  const userId: string | null = null;

  return (
    <>
      <Navbar userId={userId} />
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
        {!userId ? (
          <>
            <SignUpButton mode="modal">
              <button className="cta-btn group px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-sm hover:opacity-90 transition-all duration-300 flex items-center gap-3">
                Start Learning Free
                <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
              </button>
            </SignUpButton>
            <a href="#how-it-works" className="group px-8 py-4 rounded-2xl border border-border text-muted-foreground font-medium text-sm hover:border-indigo-500 hover:text-foreground transition-colors flex items-center gap-3">
              See How It Works
            </a>
          </>
        ) : null}
      </div>
    </>
  );
}
