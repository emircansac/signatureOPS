export type UserContext = {
  user: {
    displayName: string;
    jobTitle?: string;
    department?: string;
    country?: string;
    email: string;
    mobile?: string;
    officePhone?: string;
    photoUrl?: string;
    managerId?: string;
  };
  organization: {
    name: string;
  };
  office?: {
    address?: string;
  };
  manager?: {
    displayName?: string;
  };
  attributes?: Record<string, string | number | boolean | null>;
};

export type AssetContext = {
  id: string;
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type CampaignCtaContext = {
  text: string;
  link: string;
};

export type CampaignContext = {
  id: string;
  bannerUrl: string;
  width?: number;
  height?: number;
  slogan?: string;
  ctaOverride?: CampaignCtaContext;
  logoOverrideAssetId?: string;
  /** When false, banner lookup by campaignId is skipped. Omitted means usable. */
  active?: boolean;
};

export type IdentityColorContext = {
  id: string;
  hex: string;
  label?: string;
};

export type IdentityCompileContext = {
  logoSlotIds: {
    default?: string;
    light?: string;
    dark?: string;
    mark?: string;
  };
  socialIconMode: "standard" | "custom";
  socialIconAssetIds: Partial<Record<"linkedin" | "x" | "instagram" | "facebook" | "youtube", string>>;
  colors: IdentityColorContext[];
  tokens: {
    ink: string;
    seal: string;
    link: string;
  };
};

export type CompileContext = {
  user: UserContext;
  assets: Record<string, AssetContext>;
  campaigns: Record<string, CampaignContext>;
  /** Template-applied campaign; overlay is render-time only. */
  activeCampaignId?: string;
  identity?: IdentityCompileContext;
};
