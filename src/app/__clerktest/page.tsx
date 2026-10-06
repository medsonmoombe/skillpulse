import { SignUpButton } from "@clerk/nextjs";

export default function ClerkServerTestPage() {
  return (
    <div>
      <h1>clerk server test</h1>
      <SignUpButton mode="modal">
        <button type="button">Server CTA</button>
      </SignUpButton>
    </div>
  );
}
