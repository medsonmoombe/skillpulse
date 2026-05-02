"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { onboardUser } from "@/app/actions/user";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  discoveryIntentDescriptions,
  discoveryIntentLabels,
  type DiscoveryIntent,
} from "@/lib/discovery-intent";

type Topic = {
  id: string;
  name: string;
  slug: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [wantsToTeach, setWantsToTeach] = useState(false);
  const [discoveryIntent, setDiscoveryIntent] = useState<DiscoveryIntent>("career_growth");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch topics on mount
  useEffect(() => {
    async function fetchTopics() {
      const res = await fetch("/api/topics");
      const data = await res.json();
      setTopics(data);
    }
    fetchTopics();
  }, []);

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onboardUser(selectedTopics, wantsToTeach, discoveryIntent);
      router.push("/dashboard"); // Redirect to dashboard after onboarding
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Personalize SkillPulse</CardTitle>
          <p className="text-slate-500 text-sm">
            Choose your topics and your intent so SkillPulse can match you with the right people.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Topics Selection */}
       <div className="flex flex-wrap gap-3 justify-center">
  {topics.length === 0 ? (
    // Show Skeletons while fetching
    <>
      <Skeleton className="h-10 w-28 rounded-full" />
      <Skeleton className="h-10 w-24 rounded-full" />
      <Skeleton className="h-10 w-32 rounded-full" />
      <Skeleton className="h-10 w-20 rounded-full" />
      <Skeleton className="h-10 w-28 rounded-full" />
      <Skeleton className="h-10 w-24 rounded-full" />
    </>
  ) : (
    // Show actual topics once loaded
    topics.map((topic) => (
      <Badge
        key={topic.id}
        variant={selectedTopics.includes(topic.id) ? "default" : "outline"}
        className={`cursor-pointer text-sm px-4 py-2 transition-colors ${
          selectedTopics.includes(topic.id) 
            ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
            : "hover:bg-slate-100"
        }`}
        onClick={() => toggleTopic(topic.id)}
      >
        {topic.name}
      </Badge>
    ))
  )}
</div>

          <div className="border-t pt-4">
            <div className="mb-3">
              <p className="font-medium text-sm">
                {wantsToTeach ? "Who do you want to help most?" : "What best describes your goal right now?"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                This powers better discovery than topic matching alone.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(discoveryIntentLabels).map(([value, label]) => {
                const intentValue = value as DiscoveryIntent;
                const isActive = discoveryIntent === intentValue;

                return (
                  <button
                    key={intentValue}
                    type="button"
                    onClick={() => setDiscoveryIntent(intentValue)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-indigo-500 bg-indigo-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${isActive ? "text-indigo-900" : "text-slate-900"}`}>
                      {label}
                    </p>
                    <p className={`mt-1 text-xs leading-5 ${isActive ? "text-indigo-700" : "text-slate-500"}`}>
                      {discoveryIntentDescriptions[intentValue]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expert Toggle */}
          <div className="border-t pt-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Want to teach or coach?</p>
              <p className="text-xs text-slate-500">Switch to an Expert account to host live sessions.</p>
            </div>
            <Button 
              variant={wantsToTeach ? "default" : "outline"} 
              size="sm"
              className={wantsToTeach ? "bg-indigo-600" : ""}
              onClick={() => setWantsToTeach(!wantsToTeach)}
            >
              {wantsToTeach ? "Expert Mode" : "Become Expert"}
            </Button>
          </div>

          {/* Submit Button */}
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700" 
            onClick={handleSubmit}
            disabled={selectedTopics.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Finish Setup"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
