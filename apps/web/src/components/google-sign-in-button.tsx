"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

export function GoogleSignInButton() {
  const t = useTranslations("auth");

  return (
    <Button
      type="button"
      className="w-full"
      onClick={() => signIn("google", { callbackUrl: "/api/auth/post-login" })}
    >
      {t("continueGoogle")}
    </Button>
  );
}
