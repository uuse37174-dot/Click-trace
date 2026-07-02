export interface LinkData {
  id: string; // the short slug
  title: string;
  originalUrl: string;
  shortUrl: string;
  createdAt: any; // Timestamp
  clickCount: number;
  description?: string;
}

export interface ClickLog {
  id?: string;
  linkId: string;
  timestamp: any; // Timestamp
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  referrer: string;
}
