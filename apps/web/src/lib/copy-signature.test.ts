import { describe, expect, it } from "vitest";
import { signaturePlainText } from "./copy-signature";

describe("signaturePlainText", () => {
  it("strips tags so a notepad paste is readable", () => {
    const html =
      '<table><tr><td><p>Emircan Saç</p><p>Kurucu</p></td></tr><tr><td><img alt="logo" /></td></tr></table>';
    expect(signaturePlainText(html)).toBe("Emircan Saç\nKurucu");
  });
});
