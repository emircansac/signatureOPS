function orgFromLocation(): string {
  return new URLSearchParams(location.search).get("org") ?? "";
}

async function fetchSignatureHtml(orgSlug: string, email: string): Promise<string> {
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

function mailboxEmail(): string {
  return Office.context.mailbox.userProfile.emailAddress;
}

function setComposeSignature(html: string): Promise<void> {
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

function supportsAccountSwitchRefresh(): boolean {
  return Office.context.requirements.isSetSupported("Mailbox", "1.13");
}

async function applySignature() {
  const org = orgFromLocation();
  if (!org) throw new Error("Missing org query param on add-in URL");
  const html = await fetchSignatureHtml(org, mailboxEmail());
  await setComposeSignature(html);
}

function onNewMessageComposeHandler(event: Office.MailboxEvent) {
  applySignature()
    .catch((err) => {
      console.error("SignatureOps apply failed", err);
    })
    .finally(() => {
      event.completed();
    });
}

function onMessageFromChangedHandler(event: Office.MailboxEvent) {
  if (!supportsAccountSwitchRefresh()) {
    event.completed();
    return;
  }
  applySignature()
    .catch((err) => {
      console.error("SignatureOps from-changed failed", err);
    })
    .finally(() => {
      event.completed();
    });
}

Office.actions.associate("onNewMessageComposeHandler", onNewMessageComposeHandler);
Office.actions.associate("onMessageFromChangedHandler", onMessageFromChangedHandler);
