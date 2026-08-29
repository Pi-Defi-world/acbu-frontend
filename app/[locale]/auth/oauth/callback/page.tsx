"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

export function getSafeOAuthReturnPath(value: string | null): string {
  if (!value) {
    return "/";
  }

  const trimmedValue = value.trim();

  if (
    !trimmedValue ||
    !trimmedValue.startsWith("/") ||
    trimmedValue.startsWith("//") ||
    /^https?:\/\//i.test(trimmedValue) ||
    /^javascript:/i.test(trimmedValue) ||
    /^data:/i.test(trimmedValue)
  ) {
    return "/";
  }

  return trimmedValue;
}

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const calledRef = useRef(false);
  const [status, setStatus] = useState<"validating" | "success" | "error">(
    "validating",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      setStatus("error");
      setErrorMessage("Missing authorization code.");
      return;
    }

    const storedState = sessionStorage.getItem("oauth_state");

    if (!state || !storedState || state !== storedState) {
      setStatus("error");
      setErrorMessage("Invalid state parameter. Possible CSRF attack.");
      return;
    }

    sessionStorage.removeItem("oauth_state");

    setStatus("success");

    const returnPath = getSafeOAuthReturnPath(
      sessionStorage.getItem("oauth_return_path"),
    );
    sessionStorage.removeItem("oauth_return_path");
    router.replace(returnPath);
  }, [searchParams, router]);

  if (status === "validating") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Completing sign-in...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-destructive text-xl font-semibold">
          Authentication Error
        </h1>
        <p className="text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">
        Signed in successfully. Redirecting...
      </p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Completing sign-in...</p>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
