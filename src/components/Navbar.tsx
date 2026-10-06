"use client";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { appName } from "@/data/constant";

export function Navbar({ userId }: { userId: string | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <Zap className="text-white w-4 h-4" />
            </div>
            <span className="text-base font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              {appName}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
            <a href="#insights" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Insights</a>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {userId ? (
              <>
                <Link href="/dashboard" className="text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition-opacity">
                  Dashboard
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2">Sign In</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition-opacity">
                    Get Started Free
                  </button>
                </SignUpButton>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu border-t border-border bg-background px-6 ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="py-4 flex flex-col gap-1">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2.5" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2.5" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2.5" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
          <a href="#insights" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2.5" onClick={() => setMobileMenuOpen(false)}>Insights</a>
          <div className="pt-2 border-t border-border mt-1">
            {userId ? (
              <Link href="/dashboard" className="block text-sm font-semibold px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-center mt-2">
                Dashboard
              </Link>
            ) : (
              <SignUpButton mode="modal">
                <button className="w-full text-sm font-semibold px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white mt-2">
                  Get Started Free
                </button>
              </SignUpButton>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
