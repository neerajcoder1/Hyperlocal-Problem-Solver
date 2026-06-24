export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Pending' | 'In Progress' | 'Resolved';

export interface LocationDetail {
  lat: number;
  lng: number;
  address: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: SeverityLevel;
  location: LocationDetail;
  photos: string[]; // List of base64 data URLs or placeholders
  status: IssueStatus;
  createdAt: string;
  aiSuggestions: string;
  officialComplaint: string;
  upvotes: number;
}

export const CATEGORIES = [
  'Pothole',
  'Garbage Accumulation',
  'Broken Streetlight',
  'Water Leakage',
  'Vandalism & Graffiti',
  'Blocked Drain',
  'Stray Animal Hazard',
  'Other'
];
