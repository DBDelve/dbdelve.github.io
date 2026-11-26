// The product tour: real screenshots, and three notes per view. Each note's
// spot is a position on the screenshot (percent of its width and height).
import type { ImageMetadata } from "astro";

import importShot from "@/assets/shots/import.webp";
import queryShot from "@/assets/shots/query-dark.webp";
import planShot from "@/assets/shots/query-plan.webp";
import tableShot from "@/assets/shots/table-dark.webp";

export interface TourNote {
  id: string;
  x: number;
  y: number;
  title: string;
  /** Trusted, authored HTML (may contain <code>). */
  body: string;
}

export interface TourView {
  id: string;
  label: string;
  shot: ImageMetadata;
  alt: string;
  notes: readonly TourNote[];
}

export const TOUR: readonly TourView[] = [
  {
    id: "query",
    label: "Query",
    shot: queryShot,
    alt: "A query tab: SELECT * from events, with 1,000 rows in the grid.",
    notes: [
      {
        id: "q1",
        x: 41.5,
        y: 4.8,
        title: "Connection mode in the title bar.",
        body: "Read-only, read-write or full access. DBDelve asks before anything destructive.",
      },
      {
        id: "q2",
        x: 12,
        y: 30.6,
        title: "Schema tree with sizes.",
        body: "Tables, views, functions and procedures, per connection.",
      },
      {
        id: "q3",
        x: 79,
        y: 95,
        title: "The row limit, said out loud.",
        body: "“1,000 rows, stopped at limit”: the result is capped as rows arrive, never by rewriting your statement.",
      },
    ],
  },
  {
    id: "table",
    label: "Table",
    shot: tableShot,
    alt: "A table open in the grid, with the row panel showing one row's values and its JSON highlighted.",
    notes: [
      {
        id: "t1",
        x: 30,
        y: 39,
        title: "Edits you can read first.",
        body: "Change a cell and DBDelve writes the <code>UPDATE</code> for you to check before it runs.",
      },
      {
        id: "t2",
        x: 91,
        y: 70,
        title: "Read a row in full.",
        body: "The row panel shows every value, with JSON highlighted, and edits long ones.",
      },
      {
        id: "t3",
        x: 91.5,
        y: 9,
        title: "Data and structure.",
        body: "Columns, indexes, constraints and foreign keys sit one tab away.",
      },
    ],
  },
  {
    id: "plan",
    label: "Query plan",
    shot: planShot,
    alt: "An Explain Analyze plan for a join: each node with its actual and estimated rows and time, and a ×76 misestimate flagged.",
    notes: [
      {
        id: "p1",
        x: 30,
        y: 59.7,
        title: "The plan in its own pane.",
        body: "Explain runs on a copy of your statement; the editor keeps what you typed.",
      },
      {
        id: "p2",
        x: 16,
        y: 63.5,
        title: "Where the time went.",
        body: "Each node shows its actual and estimated rows and time.",
      },
      {
        id: "p3",
        x: 31,
        y: 78,
        title: "Bad estimates called out.",
        body: "A ×76 misestimate, flagged where you’d otherwise miss it.",
      },
    ],
  },
  {
    id: "import",
    label: "Import",
    shot: importShot,
    alt: "Importing events.csv: format options on the left, each file column mapped to a table column, and a preview of the rows.",
    notes: [
      {
        id: "i1",
        x: 43,
        y: 23.6,
        title: "Map every column.",
        body: "Each file column goes to a table column, or is skipped.",
      },
      {
        id: "i2",
        x: 67.5,
        y: 14.7,
        title: "Every statement shown.",
        body: "Rows and the SQL they become, before anything runs.",
      },
      {
        id: "i3",
        x: 9,
        y: 93,
        title: "Every row checked.",
        body: "CSV, TSV or JSON, with problems reported before import.",
      },
    ],
  },
];
