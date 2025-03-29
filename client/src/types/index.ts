// Raid Types
export const RaidType = {
  WORKPLACE: "Workplace",
  RESIDENTIAL: "Residential",
  CHECKPOINT: "Checkpoint",
  OTHER: "Other",
} as const;

export type RaidType = typeof RaidType[keyof typeof RaidType];

// Source Types
export const SourceType = {
  NEWS: "News",
  SOCIAL_MEDIA: "Social Media",
  COMMUNITY_ALERT: "Community Alert",
  LEGAL_AID: "Legal Aid Organization",
  OTHER: "Other",
} as const;

export type SourceType = typeof SourceType[keyof typeof SourceType];

// Raid data interface
export interface RaidData {
  id: number;
  title: string;
  description: string;
  location: string;
  state: string;
  latitude: string;
  longitude: string;
  raidType: RaidType;
  sourceType: SourceType;
  sourceUrl: string;
  sourceName: string;
  raidDate: string;
  detaineeCount?: number;
  verified: boolean;
  createdAt: string;
}

// Filter interface
export interface RaidFilters {
  startDate?: string;
  endDate?: string;
  state?: string;
  raidTypes?: string[];
}

// Date range options
export interface DateRangeOption {
  label: string;
  value: string;
  days?: number;
}

// US States
export const US_STATES = [
  { name: "All States", abbreviation: "ALL" },
  { name: "Alabama", abbreviation: "AL" },
  { name: "Alaska", abbreviation: "AK" },
  { name: "Arizona", abbreviation: "AZ" },
  { name: "Arkansas", abbreviation: "AR" },
  { name: "California", abbreviation: "CA" },
  { name: "Colorado", abbreviation: "CO" },
  { name: "Connecticut", abbreviation: "CT" },
  { name: "Delaware", abbreviation: "DE" },
  { name: "Florida", abbreviation: "FL" },
  { name: "Georgia", abbreviation: "GA" },
  { name: "Hawaii", abbreviation: "HI" },
  { name: "Idaho", abbreviation: "ID" },
  { name: "Illinois", abbreviation: "IL" },
  { name: "Indiana", abbreviation: "IN" },
  { name: "Iowa", abbreviation: "IA" },
  { name: "Kansas", abbreviation: "KS" },
  { name: "Kentucky", abbreviation: "KY" },
  { name: "Louisiana", abbreviation: "LA" },
  { name: "Maine", abbreviation: "ME" },
  { name: "Maryland", abbreviation: "MD" },
  { name: "Massachusetts", abbreviation: "MA" },
  { name: "Michigan", abbreviation: "MI" },
  { name: "Minnesota", abbreviation: "MN" },
  { name: "Mississippi", abbreviation: "MS" },
  { name: "Missouri", abbreviation: "MO" },
  { name: "Montana", abbreviation: "MT" },
  { name: "Nebraska", abbreviation: "NE" },
  { name: "Nevada", abbreviation: "NV" },
  { name: "New Hampshire", abbreviation: "NH" },
  { name: "New Jersey", abbreviation: "NJ" },
  { name: "New Mexico", abbreviation: "NM" },
  { name: "New York", abbreviation: "NY" },
  { name: "North Carolina", abbreviation: "NC" },
  { name: "North Dakota", abbreviation: "ND" },
  { name: "Ohio", abbreviation: "OH" },
  { name: "Oklahoma", abbreviation: "OK" },
  { name: "Oregon", abbreviation: "OR" },
  { name: "Pennsylvania", abbreviation: "PA" },
  { name: "Rhode Island", abbreviation: "RI" },
  { name: "South Carolina", abbreviation: "SC" },
  { name: "South Dakota", abbreviation: "SD" },
  { name: "Tennessee", abbreviation: "TN" },
  { name: "Texas", abbreviation: "TX" },
  { name: "Utah", abbreviation: "UT" },
  { name: "Vermont", abbreviation: "VT" },
  { name: "Virginia", abbreviation: "VA" },
  { name: "Washington", abbreviation: "WA" },
  { name: "West Virginia", abbreviation: "WV" },
  { name: "Wisconsin", abbreviation: "WI" },
  { name: "Wyoming", abbreviation: "WY" }
];
