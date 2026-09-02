import { z } from "zod";

export const CampaignStatusSchema = z.enum(["scheduled", "active", "ended"]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const CampaignCtaOverrideSchema = z.object({
  text: z.string().trim().min(1).max(40),
  link: z
    .string()
    .trim()
    .url()
    .refine((value) => value.startsWith("https://"), "CTA link must be https"),
});
export type CampaignCtaOverride = z.infer<typeof CampaignCtaOverrideSchema>;

export const CAMPAIGN_SLOGAN_MAX = 80;

const YmdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T12:00:00.000Z`)), "Invalid date");

function refineCampaignDates(
  value: { startDate: string; endDate: string },
  ctx: z.RefinementCtx,
) {
  if (value.endDate < value.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be on or after start date",
    });
  }
}

export const CampaignFieldsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  startDate: YmdSchema,
  endDate: YmdSchema,
  bannerAssetId: z.string().min(1),
  slogan: z.string().trim().max(CAMPAIGN_SLOGAN_MAX).optional(),
  ctaOverride: CampaignCtaOverrideSchema.optional(),
  logoOverrideAssetId: z.string().min(1).optional(),
  templateIds: z.array(z.string().min(1)).default([]),
});

export const CampaignInputSchema = CampaignFieldsSchema.superRefine(refineCampaignDates);
export const CampaignUpdateSchema = CampaignFieldsSchema.extend({
  id: z.string(),
}).superRefine(refineCampaignDates);

export type CampaignInput = z.infer<typeof CampaignInputSchema>;

/**
 * Campaign start/end are calendar dates, not timestamps.
 * Status is computed in this zone so "ends 31 Dec" means through 23:59:59
 * in Turkey, not UTC midnight (which is 03:00 the next morning in TR).
 * Preview and live compile must use the same zone.
 */
export const CAMPAIGN_TIMEZONE = "Europe/Istanbul";

export function campaignYmd(date: Date, timeZone = CAMPAIGN_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function toCampaignDate(ymd: string): Date {
  return new Date(`${ymd}T12:00:00.000Z`);
}

export function fromCampaignDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Calendar arithmetic on YYYY-MM-DD (noon UTC is the same civil day in Turkey). */
export function addDaysYmd(ymd: string, days: number): string {
  const date = toCampaignDate(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return fromCampaignDate(date);
}

export function campaignStatus(
  startYmd: string,
  endYmd: string,
  now = new Date(),
  timeZone = CAMPAIGN_TIMEZONE,
): CampaignStatus {
  const today = campaignYmd(now, timeZone);
  if (today < startYmd) return "scheduled";
  if (today > endYmd) return "ended";
  return "active";
}

export function dateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA <= endB && startB <= endA;
}

export function parseTemplateIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export type CampaignRecord = {
  id: string;
  startDate: Date;
  endDate: Date;
  templateIds: string[] | string;
};

export function findActiveCampaignForTemplate<T extends CampaignRecord>(
  campaigns: T[],
  templateId: string | undefined,
  now = new Date(),
  timeZone = CAMPAIGN_TIMEZONE,
): T | undefined {
  if (!templateId) return undefined;
  const active = campaigns.filter((campaign) => {
    const ids = Array.isArray(campaign.templateIds)
      ? campaign.templateIds
      : parseTemplateIds(campaign.templateIds);
    if (!ids.includes(templateId)) return false;
    return (
      campaignStatus(fromCampaignDate(campaign.startDate), fromCampaignDate(campaign.endDate), now, timeZone) ===
      "active"
    );
  });
  active.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  return active[0];
}

export function overlappingCampaign<T extends CampaignRecord>(
  campaigns: T[],
  templateIds: string[],
  startYmd: string,
  endYmd: string,
  excludeId?: string,
): T | undefined {
  if (templateIds.length === 0) return undefined;
  return campaigns.find((campaign) => {
    if (excludeId && campaign.id === excludeId) return false;
    const ids = Array.isArray(campaign.templateIds)
      ? campaign.templateIds
      : parseTemplateIds(campaign.templateIds);
    if (!ids.some((id) => templateIds.includes(id))) return false;
    return dateRangesOverlap(
      startYmd,
      endYmd,
      fromCampaignDate(campaign.startDate),
      fromCampaignDate(campaign.endDate),
    );
  });
}
