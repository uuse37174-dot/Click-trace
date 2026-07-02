import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  increment, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAX7x7EDz3lT6oNAVWjIVfM8aiDUxN1seU",
  authDomain: "glossy-kayak-q224x.firebaseapp.com",
  projectId: "glossy-kayak-q224x",
  storageBucket: "glossy-kayak-q224x.firebasestorage.app",
  messagingSenderId: "919932681547",
  appId: "1:919932681547:web:99e85daed51dd8891d3cce"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID
const db = initializeFirestore(app, {}, "ai-studio-linkclicktracker-ab384174-7221-46f9-b0f4-28b16706e046");

export interface LinkData {
  id: string; // the short slug
  title: string;
  originalUrl: string;
  shortUrl: string;
  createdAt: any; // Firestore Timestamp or Date ISO string
  clickCount: number;
  description?: string;
}

export interface ClickLog {
  id?: string;
  linkId: string;
  timestamp: any;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  referrer: string;
}

// Helper to create a new tracking link
export async function createLink(data: Omit<LinkData, 'createdAt' | 'clickCount' | 'shortUrl'>) {
  const shortUrl = `${window.location.origin}/?t=${data.id}`;
  const linkDoc: LinkData = {
    ...data,
    shortUrl,
    createdAt: Timestamp.now(),
    clickCount: 0
  };
  
  await setDoc(doc(db, 'links', data.id), linkDoc);
  return linkDoc;
}

// Helper to fetch a link by slug
export async function getLink(slug: string): Promise<LinkData | null> {
  const docSnap = await getDoc(doc(db, 'links', slug));
  if (docSnap.exists()) {
    return docSnap.data() as LinkData;
  }
  return null;
}

// Helper to update link properties
export async function updateLink(slug: string, updates: Partial<Omit<LinkData, 'id' | 'createdAt'>>) {
  const docRef = doc(db, 'links', slug);
  await updateDoc(docRef, updates);
}

// Helper to list all links
export async function getAllLinks(): Promise<LinkData[]> {
  const querySnapshot = await getDocs(query(collection(db, 'links'), orderBy('createdAt', 'desc')));
  const links: LinkData[] = [];
  querySnapshot.forEach((doc) => {
    links.push(doc.data() as LinkData);
  });
  return links;
}

// Parse user agent for analytics
function parseUserAgent(ua: string) {
  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  // Simple browser detection
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  else if (ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("MSIE") || ua.includes("Trident/")) browser = "Internet Explorer";

  // Simple OS detection
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  // Simple device detection
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
    device = "Mobile";
  } else if (/iPad|Tablet/i.test(ua)) {
    device = "Tablet";
  }

  return { browser, os, device };
}

// Helper to record a click event
export async function recordClick(slug: string, referrerUrl: string): Promise<void> {
  const uaString = navigator.userAgent;
  const { browser, os, device } = parseUserAgent(uaString);
  
  const clickData: ClickLog = {
    linkId: slug,
    timestamp: Timestamp.now(),
    userAgent: uaString,
    browser,
    os,
    device,
    referrer: referrerUrl || "Direct / No Referrer"
  };

  // Add click log document
  await addDoc(collection(db, 'clicks'), clickData);

  // Increment click count on the link
  await updateDoc(doc(db, 'links', slug), {
    clickCount: increment(1)
  });
}

// Helper to get click history for a link
export async function getClickLogs(slug: string, limitCount = 50): Promise<ClickLog[]> {
  const q = query(
    collection(db, 'clicks'),
    where('linkId', '==', slug)
  );
  const querySnapshot = await getDocs(q);
  const logs: ClickLog[] = [];
  querySnapshot.forEach((doc) => {
    logs.push({ id: doc.id, ...doc.data() } as ClickLog);
  });
  
  // Sort in-memory by timestamp descending to bypass composite index requirements
  logs.sort((a, b) => {
    const timeA = a.timestamp?.seconds || 0;
    const timeB = b.timestamp?.seconds || 0;
    return timeB - timeA;
  });

  return logs.slice(0, limitCount);
}
