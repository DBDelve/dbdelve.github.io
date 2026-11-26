// Links and identity shared by the layout, the sections and SEO.
const repo = "https://github.com/ShayanAbbas1/dbdelve";

export const SITE = {
  name: "DBDelve",
  url: "https://dbdelve.github.io",
  title: "DBDelve — a fast, native database client",
  description:
    "DBDelve is a fast, native, multi-engine database client for macOS, Linux and Windows. Written in Rust with GPUI: no Electron, no JVM. Free and open source, no telemetry.",
  ogDescription:
    "Dive deep into your data. A fast, native, multi-engine database client written in Rust. Free and open source, no telemetry.",
  ogImage: "/assets/og.png",
  ogImageAlt: "The DBDelve icon, a diver lighting rows of data, beside the DBDelve app window",
  themeColor: "#0a2a30",
  googleSiteVerification: "KqxigudMq9rtVuj3qg1Lq3658LhI7FAmIzlCinJBI94",
} as const;

export const LINKS = {
  repo,
  release: `${repo}/releases/latest`,
  releases: `${repo}/releases`,
  issues: `${repo}/issues`,
  license: `${repo}/blob/main/LICENSE`,
  benchmarks: `${repo}/blob/main/BENCHMARKS.md`,
  odbc: `${repo}/blob/main/docs/odbc.md`,
  install: `${repo}/blob/main/docs/install.md`,
  discord: "https://discord.gg/7PegWzwqCm",
  patreon: "https://www.patreon.com/membership/30003257",
  aurPackager: "https://github.com/0PandaDEV",
} as const;
