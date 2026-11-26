// Published by the DBDelve project in BENCHMARKS.md, measured 2026-10-11.
// Not re-measured here. `a` is DBDelve, `b` is DBeaver; shorter is better.
export interface BenchRow {
  measure: string;
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  footnote?: boolean;
}

export const BENCH_ROWS: readonly BenchRow[] = [
  { measure: "Launch to a connected window", a: 1.13, b: 5.2, aLabel: "1.13 s", bLabel: "5.20 s" },
  { measure: "Idle memory", a: 133, b: 606, aLabel: "133 MB", bLabel: "606 MB" },
  { measure: "1,000-row query", a: 0.21, b: 1.96, aLabel: "0.21 s", bLabel: "1.96 s" },
  { measure: "100,000-row query", a: 5.55, b: 20, aLabel: "5.55 s", bLabel: "20.0 s" },
  { measure: "1,000,000-row query", a: 55.6, b: 207.5, aLabel: "55.6 s", bLabel: "207.5 s" },
  {
    measure: "Memory holding 1M rows",
    a: 4.9,
    b: 17,
    aLabel: "4.9 GB",
    bLabel: "17 GB",
    footnote: true,
  },
];

export const BENCH_METHOD: readonly [string, string][] = [
  ["Machine", "MacBook Pro, M1 Pro, 32 GB, macOS 26, on AC power"],
  [
    "Database",
    "Postgres 15 from the repository’s <code>compose.yaml</code>, amd64 under emulation",
  ],
  ["Table", "<code>events</code>: 1,000,000 rows × 107 columns, 3 GB on disk"],
  [
    "Runs",
    "Median of 5 per app per size, apps taking turns; launch is the median of 20 cold launches",
  ],
  ["Settings", "Row limit off in both apps; DBeaver’s heap raised to 16 GB"],
];

export const BENCH_CAVEATS: readonly string[] = [
  "One machine, one database, one table. Wider or narrower tables will move the numbers.",
  "The two apps keep their own default layouts, so their result panes are not the same size.",
  "DBeaver’s launch CPU includes JIT warm-up.",
  "The harness is not part of the repository.",
];
