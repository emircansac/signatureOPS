import { describe, expect, it } from "vitest";
import { pickOrgForJoinDomain, type JoinOrgRecord } from "./org-join-select";

function org(partial: Partial<JoinOrgRecord> & Pick<JoinOrgRecord, "id">): JoinOrgRecord {
  return {
    name: partial.name ?? partial.id,
    slug: partial.slug ?? partial.id,
    joinDomain: partial.joinDomain ?? null,
    ...partial,
  };
}

describe("pickOrgForJoinDomain", () => {
  it("returns the org that claimed the domain", () => {
    const claimed = org({ id: "claimed", joinDomain: "acme.com" });
    const other = org({ id: "other", joinDomain: "other.com" });
    expect(pickOrgForJoinDomain("Acme.com", [other, claimed])?.id).toBe("claimed");
  });

  it("returns null when two orgs claim the same domain", () => {
    const a = org({ id: "a", joinDomain: "acme.com" });
    const b = org({ id: "b", joinDomain: "acme.com" });
    expect(pickOrgForJoinDomain("acme.com", [a, b])).toBeNull();
  });

  it("ignores unrelated orgs", () => {
    expect(pickOrgForJoinDomain("acme.com", [org({ id: "other", joinDomain: "other.com" })])).toBeNull();
  });
});
