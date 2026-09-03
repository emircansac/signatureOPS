import {
  fetchSignatureHtml,
  mailboxEmail,
  orgFromLocation,
  setComposeSignature,
} from "./signature";

Office.onReady(() => {
  const button = document.getElementById("apply");
  const status = document.getElementById("status");
  button?.addEventListener("click", async () => {
    if (status) status.textContent = "Applying…";
    try {
      const org = orgFromLocation();
      const html = await fetchSignatureHtml(org, mailboxEmail());
      await setComposeSignature(html);
      if (status) status.textContent = "Signature applied at compose time.";
    } catch (err) {
      if (status) status.textContent = err instanceof Error ? err.message : "Failed";
    }
  });
});
