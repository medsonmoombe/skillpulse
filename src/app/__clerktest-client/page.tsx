"use client";

import { SignUpButton } from "@clerk/nextjs";

export default function ClerkClientTestPage() {
  return (
    <div>
      <h1>clerk client test</h1>
      <SignUpButton mode="modal">
        <button type="button">Client CTA</button>
      </SignUpButton>
    </div>
  );
}
