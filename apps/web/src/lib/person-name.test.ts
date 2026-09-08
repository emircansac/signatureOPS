import { describe, expect, it } from "vitest";
import { joinDisplayName, personPhotoFilename, personPhotoStem, sanitizeFilenameStem, splitDisplayName } from "./person-name";

describe("splitDisplayName", () => {
  it("splits given and family names", () => {
    expect(splitDisplayName("Ayşe Yılmaz")).toEqual({ firstName: "Ayşe", lastName: "Yılmaz" });
  });

  it("keeps extra tokens on the family name", () => {
    expect(splitDisplayName("Ayşe Nur Yılmaz")).toEqual({
      firstName: "Ayşe",
      lastName: "Nur Yılmaz",
    });
  });

  it("leaves a single token as the given name", () => {
    expect(splitDisplayName("Madonna")).toEqual({ firstName: "Madonna", lastName: "" });
  });
});

describe("joinDisplayName", () => {
  it("joins given and family names", () => {
    expect(joinDisplayName("Ayşe", "Yılmaz")).toBe("Ayşe Yılmaz");
  });

  it("collapses inner whitespace", () => {
    expect(joinDisplayName("  Ayşe  ", "  Nur   Yılmaz ")).toBe("Ayşe Nur Yılmaz");
  });
});

describe("personPhotoStem", () => {
  it("builds first_last_title without diacritics", () => {
    expect(personPhotoStem("Ayşe", "Yılmaz", "Satış Müdürü")).toBe("ayse_yilmaz_satis_muduru");
  });

  it("ignores the original upload filename", () => {
    expect(personPhotoStem("Test", "Kişi", "Analist")).toBe("test_kisi_analist");
    expect(personPhotoFilename("Test", "Kişi", "Analist", "image/jpeg")).toBe("test_kisi_analist.jpg");
  });
});

describe("sanitizeFilenameStem", () => {
  it("strips path characters", () => {
    expect(sanitizeFilenameStem("../../evil name.jpg")).toBe("evil_name_jpg");
  });
});
