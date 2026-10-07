import { ThemeKey } from "./themes";

// ==========================================
// KreaLink Core Domain Types
// ==========================================

export type CreatorProfile = {
  ownerUid?: string;
  name: string;
  username: string;
  email?: string;
  bio: string;
  specialization: string;
  skills: string[];
  aiTools: string[];
  aiModels: string[];
  contentTypes: string[];
  formats: string[];
  commercialUse: boolean;
  availability: string;
  workflow?: string;
  profilePhoto?: string;
  socialLinks?: {
    website?: string;
    instagram?: string;
    youtube?: string;
    x?: string;
  };
  verified?: boolean;
  verification?: {
    tools: boolean;
    workflow: boolean;
    portfolio: boolean;
  };
  status?: string;
  theme?: ThemeKey;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type PortfolioItem = {
  id: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  contentType?: string;
  tools?: string[];
  models?: string[];
  skills?: string[];
  workflow?: string;
  formats?: string[];
  commercialUse?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type BrandProfile = {
  id: string;
  ownerUid: string;
  name: string;
  industry: string;
  description: string;
  logo?: string;
  contactEmail?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

// ==========================================
// Canonical Status Enums & Lifecycle Constants
// ==========================================

export const BRIEF_STATUS = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  MATCHED: "Matched",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
} as const;
export type BriefStatus = (typeof BRIEF_STATUS)[keyof typeof BRIEF_STATUS];

export const INVITATION_STATUS = {
  INVITED: "Invited",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
} as const;
export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

export const ENGAGEMENT_STATUS = {
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  DELIVERED: "Delivered",
} as const;
export type EngagementStatus = (typeof ENGAGEMENT_STATUS)[keyof typeof ENGAGEMENT_STATUS];

export type CreativeBrief = {
  id?: string;
  ownerUid?: string; // Brand owner Firebase Auth UID
  brandId: string;
  brandName?: string;
  campaignName: string;
  requirements: string;
  contentType: string;
  style: string[];
  platform: string;
  aspectRatio: string;
  targetAudience: string;
  deliverables: string[];
  commercialUse: boolean;
  notes?: string;
  status: BriefStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type Invitation = {
  id?: string;
  ownerUid?: string; // Authoritative sender UID
  brandOwnerUid?: string;
  creatorOwnerUid?: string;
  brandId: string;
  brandName: string;
  creatorUsername: string;
  briefId?: string;
  campaignTitle: string;
  contentType?: string;
  message: string;
  contactEmail: string;
  status: InvitationStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type Engagement = {
  id?: string;
  invitationId?: string;
  briefId?: string;
  brandId: string;
  brandName: string;
  brandOwnerUid?: string;
  creatorUsername: string;
  creatorOwnerUid?: string;
  campaignTitle: string;
  deliverables?: string[];
  status: EngagementStatus;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

// ==========================================
// Matching Engine Types
// ==========================================

export type MatchFactorScores = {
  contentType: number;      // 25% weight
  skills: number;           // 20% weight
  tools: number;            // 15% weight
  specialization: number;   // 15% weight
  format: number;           // 10% weight
  commercialUse: number;    // 10% weight
  portfolioRelevance: number; // 5% weight
};

export type CreatorMatchResult = {
  creator: CreatorProfile;
  overallScore: number;     // 0-100 normalized
  factorScores: MatchFactorScores;
  matchedSkills: string[];
  matchedTools: string[];
  matchedFormats: string[];
  reasons: string[];
  explanation: string;
};
