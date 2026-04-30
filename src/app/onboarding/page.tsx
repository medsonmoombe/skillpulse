"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { onboardUser } from "@/app/actions/user";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

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
      await onboardUser(selectedTopics, wantsToTeach);
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
          <p className="text-slate-500 text-sm">Select what you're interested in to customize your feed.</p>
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