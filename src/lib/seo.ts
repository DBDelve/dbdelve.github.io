// SEO helpers, adapted from the Astro starter: one source of truth for the
// page's title, description, social cards, canonical URL and JSON-LD.
import { LINKS, SITE } from "@/data/site";

type StructuredDataValue =
  | string
  | number
  | boolean
  | null
  | StructuredDataValue[]
  | { [key: string]: StructuredDataValue };

export type StructuredData = Record<string, StructuredDataValue>;

export interface SeoMeta {
  title: string;
  description: string;
  canonicalUrl?: string;
  noindex?: boolean;
  image?: { url: string; alt?: string; width?: number; height?: number };
  structuredData?: readonly StructuredData[];
}

/** Serialize JSON-LD objects into <script> tags for `set:html`. `<` is escaped so data can't close the tag. */
export function jsonLdScript(items: readonly StructuredData[]): string {
  return items
    .map(
      (item) =>
        `<script type="application/ld+json">${JSON.stringify(item).replace(/</g, "\\u003c")}</script>`
    )
    .join("");
}

export function softwareApplicationSchema(): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Linux, Windows",
    license: "https://www.gnu.org/licenses/gpl-3.0.html",
    downloadUrl: LINKS.release,
    codeRepository: LINKS.repo,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export const homeSeo: SeoMeta = {
  title: SITE.title,
  description: SITE.description,
  image: { url: SITE.ogImage, alt: SITE.ogImageAlt, width: 1200, height: 630 },
  structuredData: [softwareApplicationSchema()],
};
