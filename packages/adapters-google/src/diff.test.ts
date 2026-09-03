import { describe, expect, it } from "vitest";
import { diffSanitizedHtml } from "./diff.js";

describe("diffSanitizedHtml", () => {
  it("reports no change when HTML is equivalent", () => {
    const html = "<div><b>Hello</b></div>";
    const diff = diffSanitizedHtml(html, html);
    expect(diff.changed).toBe(false);
    expect(diff.tagsRemoved).toEqual([]);
  });

  it("detects Gmail stripping tags", () => {
    const submitted = '<div><span style="color:red">Hi</span><script>x</script></div>';
    const stored = "<div>Hi</div>";
    const diff = diffSanitizedHtml(submitted, stored);
    expect(diff.changed).toBe(true);
    expect(diff.tagsRemoved).toEqual(expect.arrayContaining(["span", "script"]));
    expect(diff.summary).toContain("differs");
  });
});
