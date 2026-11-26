// Sponsors, read at build time from public/sponsors/sponsors.json (written
// daily by the sponsorkit workflow). Tiers match the README: logos for Gold
// and up, names for Silver and Bronze; Supporters are named in the README only.
import data from "../../public/sponsors/sponsors.json";

export interface Sponsor {
  name: string;
  link?: string;
  avatar?: string;
  monthlyDollars: number;
}

export interface SponsorTier {
  min: number;
  title: string;
  logo?: "lg" | "md";
  size?: number;
  linked: boolean;
  members: Sponsor[];
}

const httpUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
};

const sponsors: Sponsor[] = (Array.isArray(data) ? (data as unknown[]) : [])
  .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
  .filter((s) => typeof s.name === "string" && s.name.trim() !== "" && Number(s.monthlyDollars) > 0)
  .map((s) => ({
    name: String(s.name).trim(),
    link: httpUrl(s.link),
    avatar: httpUrl(s.avatar),
    monthlyDollars: Number(s.monthlyDollars),
  }));

const TIERS: Omit<SponsorTier, "members">[] = [
  { min: 200, title: "Platinum", logo: "lg", size: 88, linked: true },
  { min: 100, title: "Gold", logo: "md", size: 56, linked: true },
  { min: 50, title: "Silver", linked: true },
  { min: 20, title: "Bronze", linked: false },
];

export const SPONSOR_TIERS: SponsorTier[] = TIERS.map((t) => ({
  ...t,
  members: sponsors.filter((s) => TIERS.find((x) => s.monthlyDollars >= x.min) === t),
})).filter((t) => t.members.length > 0);
