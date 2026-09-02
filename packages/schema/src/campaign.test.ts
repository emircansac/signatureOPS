import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_TIMEZONE,
  CampaignInputSchema,
  campaignStatus,
  campaignYmd,
  dateRangesOverlap,
  findActiveCampaignForTemplate,
  overlappingCampaign,
} from "./campaign.js";

describe("campaignStatus", () => {
  it("uses Europe/Istanbul, not UTC, as the campaign calendar", () => {
    expect(CAMPAIGN_TIMEZONE).toBe("Europe/Istanbul");
  });

  it("is scheduled before local midnight on the start day", () => {
    // 10 Sep 00:00 TR = 9 Sep 21:00 UTC
    expect(campaignStatus("2026-09-10", "2026-09-20", new Date("2026-09-09T20:59:59.000Z"))).toBe(
      "scheduled",
    );
    expect(campaignStatus("2026-09-10", "2026-09-20", new Date("2026-09-09T21:00:00.000Z"))).toBe(
      "active",
    );
  });

  it("keeps the campaign active through the last hour of endDate in Turkey", () => {
    // 31 Dec 2026 23:00 TR = 31 Dec 20:00 UTC
    const lastHourOfEndDate = new Date("2026-12-31T20:00:00.000Z");
    expect(campaignYmd(lastHourOfEndDate)).toBe("2026-12-31");
    expect(campaignStatus("2026-01-01", "2026-12-31", lastHourOfEndDate)).toBe("active");
  });

  it("flips Aktif → Bitti at local midnight after endDate, not at UTC midnight", () => {
    // 1 Jan 2027 00:00 TR = 31 Dec 2026 21:00 UTC
    const firstHourOfNextDay = new Date("2026-12-31T21:00:00.000Z");
    expect(campaignYmd(firstHourOfNextDay)).toBe("2027-01-01");
    expect(campaignStatus("2026-01-01", "2026-12-31", firstHourOfNextDay)).toBe("ended");

    // Same instant is still 31 Dec 21:00 UTC — a UTC calendar would wrongly stay Aktif
    expect(campaignYmd(firstHourOfNextDay, "UTC")).toBe("2026-12-31");
    expect(campaignStatus("2026-01-01", "2026-12-31", firstHourOfNextDay, "UTC")).toBe("active");
  });

  it("ends at 02:00 TR on 1 Jan even though UTC is still 31 Dec 23:00", () => {
    // "31 Aralık'ta bitsin" must not still be Aktif at 02:00 in Turkey
    const stillEndDateInUtc = new Date("2026-12-31T23:00:00.000Z");
    expect(campaignYmd(stillEndDateInUtc)).toBe("2027-01-01");
    expect(campaignStatus("2026-01-01", "2026-12-31", stillEndDateInUtc)).toBe("ended");
    expect(campaignStatus("2026-01-01", "2026-12-31", stillEndDateInUtc, "UTC")).toBe("active");
  });

  it("stays active at the first instant of endDate in Turkey", () => {
    // 30 Jun 00:00 TR = 29 Jun 21:00 UTC
    const startOfEndDate = new Date("2026-06-29T21:00:00.000Z");
    expect(campaignYmd(startOfEndDate)).toBe("2026-06-30");
    expect(campaignStatus("2026-06-01", "2026-06-30", startOfEndDate)).toBe("active");
  });
});

describe("dateRangesOverlap", () => {
  it("treats touching inclusive ranges as overlap", () => {
    expect(dateRangesOverlap("2026-03-01", "2026-06-30", "2026-06-30", "2026-07-15")).toBe(true);
    expect(dateRangesOverlap("2026-03-01", "2026-06-29", "2026-06-30", "2026-07-15")).toBe(false);
  });
});

describe("CampaignInputSchema", () => {
  it("rejects an end date before the start date", () => {
    const result = CampaignInputSchema.safeParse({
      name: "Launch",
      startDate: "2026-06-10",
      endDate: "2026-06-01",
      bannerAssetId: "banner-1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional slogan, CTA, and logo override", () => {
    const result = CampaignInputSchema.parse({
      name: "10. Yıl Kutlaması",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      bannerAssetId: "banner-1",
      slogan: "Birlikte 10 yıl",
      ctaOverride: { text: "Kutla", link: "https://acme.com/10" },
      logoOverrideAssetId: "logo-alt",
      templateIds: ["tpl-default"],
    });
    expect(result.slogan).toBe("Birlikte 10 yıl");
    expect(result.ctaOverride?.text).toBe("Kutla");
  });
});

describe("findActiveCampaignForTemplate", () => {
  const campaigns = [
    {
      id: "ended",
      startDate: new Date("2026-01-01T12:00:00.000Z"),
      endDate: new Date("2026-01-31T12:00:00.000Z"),
      templateIds: ["tpl-a"],
    },
    {
      id: "live",
      startDate: new Date("2026-09-01T12:00:00.000Z"),
      endDate: new Date("2026-09-30T12:00:00.000Z"),
      templateIds: ["tpl-a"],
    },
  ];

  it("returns the active campaign for a template and ignores ended ones", () => {
    const now = new Date("2026-09-02T12:00:00.000Z");
    expect(findActiveCampaignForTemplate(campaigns, "tpl-a", now)?.id).toBe("live");
    expect(findActiveCampaignForTemplate(campaigns, "tpl-b", now)).toBeUndefined();
  });

  it("includes endDate until local midnight and drops the campaign the next hour", () => {
    const yearEnd = [
      {
        id: "year",
        startDate: new Date("2026-01-01T12:00:00.000Z"),
        endDate: new Date("2026-12-31T12:00:00.000Z"),
        templateIds: ["tpl-a"],
      },
    ];
    const lastHourOfEndDate = new Date("2026-12-31T20:00:00.000Z");
    const firstHourOfNextDay = new Date("2026-12-31T21:00:00.000Z");
    expect(findActiveCampaignForTemplate(yearEnd, "tpl-a", lastHourOfEndDate)?.id).toBe("year");
    expect(findActiveCampaignForTemplate(yearEnd, "tpl-a", firstHourOfNextDay)).toBeUndefined();
  });
});

describe("overlappingCampaign", () => {
  const existing = [
    {
      id: "spring",
      startDate: new Date("2026-03-01T12:00:00.000Z"),
      endDate: new Date("2026-06-30T12:00:00.000Z"),
      templateIds: ["tpl-sales"],
    },
  ];

  it("finds a date overlap on the same template", () => {
    expect(overlappingCampaign(existing, ["tpl-sales"], "2026-06-01", "2026-07-01")?.id).toBe("spring");
    expect(overlappingCampaign(existing, ["tpl-default"], "2026-06-01", "2026-07-01")).toBeUndefined();
    expect(overlappingCampaign(existing, ["tpl-sales"], "2026-07-01", "2026-07-15")).toBeUndefined();
  });
});
