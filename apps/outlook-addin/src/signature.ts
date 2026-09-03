export function orgFromLocation(search = location.search): string {
  return new URLSearchParams(search).get("org") ?? "";
}

export async function fetchSignatureHtml(orgSlug: string, email: string): Promise<string> {
  const url = new URL("/api/addin/signature", location.origin);
  url.searchParams.set("org", orgSlug);
  url.searchParams.set("email", email);
  const res = await fetch(url.toString(), { headers: { Accept: "text/html" } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Signature fetch failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.text();
}

export function mailboxEmail(): string {
  return Office.context.mailbox.userProfile.emailAddress;
}

export function setComposeSignature(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Office.context.mailbox.item.body.setSignatureAsync(
      html,
      { coercionType: Office.CoercionType.Html },
      (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          reject(new Error(result.error?.message ?? "setSignatureAsync failed"));
          return;
        }
        resolve();
      },
    );
  });
}

export function supportsAccountSwitchRefresh(): boolean {
  return Office.context.requirements.isSetSupported("Mailbox", "1.13");
}
