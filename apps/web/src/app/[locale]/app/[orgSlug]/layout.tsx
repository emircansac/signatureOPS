import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default async function OrgAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; orgSlug: string }>;
}) {
  const { locale, orgSlug } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/giris`);
  }
  if (!session.orgSlug) {
    redirect(`/${locale}/onboarding`);
  }
  if (session.orgSlug !== orgSlug) {
    redirect(`/${locale}/app/${session.orgSlug}`);
  }

  return (
    <AppShell locale={locale} orgSlug={session.orgSlug} orgName={session.orgName ?? ""}>
      {children}
    </AppShell>
  );
}
