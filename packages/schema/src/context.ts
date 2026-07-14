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

export type CampaignContext = {
  id: string;
  bannerUrl: string;
  width?: number;
  height?: number;
};

export type CompileContext = {
  user: UserContext;
  assets: Record<string, AssetContext>;
  campaigns: Record<string, CampaignContext>;
};
