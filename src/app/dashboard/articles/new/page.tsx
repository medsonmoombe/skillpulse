// src/app/dashboard/articles/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createArticle } from "@/app/actions/article";

type Topic = {
  id: string;
  name: string;
};

export default function NewArticlePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchTopics() {
      const res = await fetch("/api/topics");
      const data = await res.json();
      setTopics(data);
    }
    fetchTopics();
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      await createArticle(formData);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="border-b bg-white h-16 flex items-center justify-between px-6 max-w-7xl mx-auto">
        <a href="/dashboard" className="text-xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
          SkillPulse
        </a>
        <a href="/dashboard">
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </a>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Write an Article</CardTitle>
            <p className="text-slate-500 text-sm">Share your knowledge and attract learners to your profile.</p>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  name="title" 
                  placeholder="e.g., 5 Ways to Master React Hooks" 
                  required 
                />
              </div>

              {/* Topic Selection */}
              <div className="space-y-2">
                <Label htmlFor="topicId">Topic (Optional)</Label>
                <select 
                  id="topicId" 
                  name="topicId"
                  className="w-full h-9 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select a topic...</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea 
                  id="content" 
                  name="content" 
                  placeholder="Write your article here. Use line breaks for paragraphs..." 
                  required 
                  className="min-h-[300px]"
                />
              </div>

              {/* Publish Checkbox & Submit */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isPublished" 
                    name="isPublished" 
                    defaultChecked 
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="isPublished" className="text-sm text-slate-600">
                    Publish immediately
                  </Label>
                </div>

                <div className="flex gap-2">
                  {/* Save as Draft (Unchecked) */}
                  <Button variant="outline" type="submit" disabled={isSubmitting} onClick={() => {
                    const checkbox = document.getElementById('isPublished') as HTMLInputElement;
                    if (checkbox) checkbox.checked = false;
                  }}>
                    {isSubmitting ? "Saving..." : "Save Draft"}
                  </Button>
                  
                  {/* Publish (Checked) */}
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
                    {isSubmitting ? "Publishing..." : "Publish Article"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}