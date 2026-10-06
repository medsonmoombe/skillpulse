"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { onboardUser } from "@/app/actions/user";
import { useRouter } from "next/navigation";
import {
  discoveryIntentDescriptions,
  discoveryIntentLabels,
  type DiscoveryIntent,
} from "@/lib/discovery-intent";
import { CheckCircle2, Sparkles, BookOpen, Users, ArrowRight, ArrowLeft, Zap } from "lucide-react";
import { appName } from "@/data/constant";

type Topic = { id: string; name: string; slug: string };

const STEPS = ["Topics", "Your Goal", "Role"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [discoveryIntent, setDiscoveryIntent] = useState<DiscoveryIntent>("career_growth");
  const [wantsToTeach, setWantsToTeach] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/topics").then((r) => r.json()).then(setTopics).catch(() => {});
  }, []);

  const toggleTopic = (id: string) =>
    setSelectedTopics((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onboardUser(selectedTopics, wantsToTeach, discoveryIntent);
      router.push("/dashboard");
    } catch { setIsSubmitting(false); }
  };

  const canNext = step === 0 ? selectedTopics.length > 0 : true;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
          <Zap className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-xl font-extrabold text-transparent">
          {appName}
        </span>
      </div>

      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  i < step ? "bg-indigo-600 text-white" :
                  i === step ? "bg-indigo-600 text-white ring-4 ring-indigo-100" :
                  "bg-slate-200 text-slate-500"
                }`}>
                  {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${i === step ? "text-indigo-700" : "text-slate-400"}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`mx-2 h-px w-12 sm:w-20 ${i < step ? "bg-indigo-400" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">

          {/* Step 0 — Topics */}
          {step === 0 && (
            <div className="p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                  <BookOpen className="h-7 w-7 text-indigo-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">What do you want to learn?</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Pick the topics you care about. We'll use these to match you with the right people.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2.5">
                {topics.length === 0 ? (
                  <>
                    {[28, 24, 32, 20, 28, 24, 20, 32].map((w, i) => (
                      <Skeleton key={i} className={`h-9 w-${w} rounded-full`} />
                    ))}
                  </>
                ) : (
                  topics.map((topic) => {
                    const active = selectedTopics.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.id)}
                        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                          active
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                        }`}
                      >
                        {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {topic.name}
                      </button>
                    );
                  })
                )}
              </div>

              {selectedTopics.length > 0 && (
                <p className="mt-4 text-center text-xs text-indigo-600 font-medium">
                  {selectedTopics.length} topic{selectedTopics.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}

          {/* Step 1 — Discovery Intent */}
          {step === 1 && (
            <div className="p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50">
                  <Sparkles className="h-7 w-7 text-purple-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">What's your goal right now?</h1>
                <p className="mt-2 text-sm text-slate-500">
                  This powers smarter matching beyond just topic overlap.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(discoveryIntentLabels).map(([value, label]) => {
                  const intent = value as DiscoveryIntent;
                  const active = discoveryIntent === intent;
                  return (
                    <button
                      key={intent}
                      type="button"
                      onClick={() => setDiscoveryIntent(intent)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold ${active ? "text-indigo-900" : "text-slate-900"}`}>
                          {label}
                        </p>
                        {active && <CheckCircle2 className="h-4 w-4 text-indigo-500" />}
                      </div>
                      <p className={`mt-1 text-xs leading-relaxed ${active ? "text-indigo-700" : "text-slate-500"}`}>
                        {discoveryIntentDescriptions[intent]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2 — Role */}
          {step === 2 && (
            <div className="p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                  <Users className="h-7 w-7 text-emerald-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">How do you want to show up?</h1>
                <p className="mt-2 text-sm text-slate-500">
                  You can always change this later in settings.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    value: false,
                    title: "I'm here to learn",
                    desc: "Get matched with experts, join live sessions, and level up your skills.",
                    icon: BookOpen,
                    color: "text-indigo-500 bg-indigo-50",
                    active: "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200",
                  },
                  {
                    value: true,
                    title: "I want to teach",
                    desc: "Host live sessions, share articles, and get matched with learners who need you.",
                    icon: Sparkles,
                    color: "text-purple-500 bg-purple-50",
                    active: "border-purple-300 bg-purple-50 ring-1 ring-purple-200",
                  },
                ].map(({ value, title, desc, icon: Icon, color, active }) => {
                  const isActive = wantsToTeach === value;
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() => setWantsToTeach(value)}
                      className={`rounded-2xl border p-5 text-left transition-all ${
                        isActive ? active : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">{title}</p>
                        {isActive && <CheckCircle2 className="h-4 w-4 text-indigo-500" />}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer nav */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-8 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="gap-1.5 text-slate-500"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-md shadow-indigo-200 hover:opacity-90"
              >
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-md shadow-indigo-200 hover:opacity-90"
              >
                {isSubmitting ? "Setting up…" : "Finish Setup"}
                {!isSubmitting && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          You can update all of this anytime in your settings.
        </p>
      </div>
    </main>
  );
}
