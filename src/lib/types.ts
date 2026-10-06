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
  createdAt?: any;
  updatedAt?: any;
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
  createdAt?: any;
  updatedAt?: any;
};

export type BrandProfile = {
  id: string;
  ownerUid: string;
  name: string;
  industry: string;
  description: string;
  logo?: string;
  contactEmail?: string;
  createdAt?: any;
  updatedAt?: any;
};

export type CreativeBrief = {
  id?: string;
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
  status: "Draft" | "Published" | "Matched" | "In Progress" | "Completed";
  createdAt?: any;
  updatedAt?: any;
};

export type Invitation = {
  id?: string;
  brandId: string;
  brandName: string;
  creatorUsername: string;
  briefId?: string;
  campaignTitle: string;
  contentType?: string;
  message: string;
  contactEmail: string;
  status: "Invited" | "Accepted" | "Declined";
  createdAt?: any;
  updatedAt?: any;
};

export type Engagement = {
  id?: string;
  invitationId?: string;
  briefId?: string;
  brandId: string;
  brandName: string;
  creatorUsername: string;
  campaignTitle: string;
  deliverables?: string[];
  status: "Accepted" | "In Progress" | "Delivered";
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
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
