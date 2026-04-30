"use client";

import { useState } from "react";
import { createGroupPost } from "@/app/actions/group";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  groupId: string;
}

export function ChatInput({ groupId }: ChatInputProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      await createGroupPost(formData);
      setContent(""); // Clear input on success
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form action={handleSubmit} className="mt-4">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="flex flex-col gap-2">
        <Textarea
          name="content"
          placeholder="Type your message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={2}
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            size="sm" 
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </form>
  );
}