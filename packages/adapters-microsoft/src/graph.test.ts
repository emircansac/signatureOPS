import { describe, expect, it } from "vitest";
import { microsoftSignatureWriteSupported } from "./graph.js";

describe("microsoft adapter", () => {
  it("does not claim a Graph signature write API", () => {
    expect(microsoftSignatureWriteSupported()).toBe(false);
  });
});
