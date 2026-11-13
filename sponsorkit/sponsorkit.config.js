import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, tierPresets } from "sponsorkit";

// Keyed by the patron's Patreon profile URL, as it appears in `link` in
// sponsors/sponsors.json: { "<url>": { "name", "link", "avatar", "hide" } }.
const overrides = JSON.parse(
    readFileSync(new URL("./overrides.json", import.meta.url), "utf8"),
);

const httpUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:"
            ? url.href
            : undefined;
    } catch {
        return undefined;
    }
};

const escapeXml = (value) =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const LOGO_DOLLARS = 100;

export default defineConfig({
    outputDir: "../sponsors",
    cacheFile: fileURLToPath(new URL("./.cache.json", import.meta.url)),
    name: "sponsors",
    formats: ["json", "svg"],
    width: 800,
    tiers: [
        { title: "Supporters", preset: tierPresets.none },
        { title: "Bronze", monthlyDollars: 20, preset: tierPresets.medium },
        { title: "Silver", monthlyDollars: 50, preset: tierPresets.large },
        { title: "Gold", monthlyDollars: LOGO_DOLLARS, preset: tierPresets.xl },
        {
            title: "Platinum",
            monthlyDollars: 200,
            preset: {
                avatar: { size: 120 },
                boxWidth: 170,
                boxHeight: 160,
                container: { sidePadding: 20 },
                name: { maxLength: 24 },
            },
        },
    ],

    onSponsorsFetched(sponsorships) {
        return sponsorships
            .filter((ship) => ship.monthlyDollars > 0)
            .filter((ship) => !overrides[ship.sponsor.linkUrl]?.hide)
            .map((ship, i) => {
                const o = overrides[ship.sponsor.linkUrl] ?? {};
                const name = (o.name ?? ship.sponsor.name).trim();
                const link = httpUrl(o.link ?? ship.sponsor.linkUrl);
                const avatar = httpUrl(o.avatar ?? ship.sponsor.avatarUrl);
                ship.sponsor = {
                    ...ship.sponsor,
                    login: `patron-${i}`,
                    name,
                    avatarUrl: avatar ?? "",
                    // sponsorkit writes href into the SVG unescaped.
                    linkUrl: link && escapeXml(link),
                    type:
                        ship.monthlyDollars >= LOGO_DOLLARS
                            ? "Organization"
                            : "User",
                };
                ship.site = { name, link, avatar };
                return ship;
            });
    },

    onBeforeRenderer(sponsorships) {
        // The SVG and the JSON are rendered from the same objects; toJSON keeps
        // the avatar buffers the SVG needs out of the JSON the site reads.
        for (const ship of sponsorships) {
            ship.toJSON = () => ({
                ...ship.site,
                monthlyDollars: ship.monthlyDollars,
            });
        }
    },
});
