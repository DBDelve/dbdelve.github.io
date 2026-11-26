// Engines DBDelve speaks natively, and what is reachable through the ODBC
// bridge. Marks are the same Simple Icons / Lucide sources the client draws.
import type { ImageMetadata } from "astro";

import clickhouse from "@/assets/engines/clickhouse.svg";
import duckdb from "@/assets/engines/duckdb.svg";
import mariadb from "@/assets/engines/mariadb.svg";
import mongodb from "@/assets/engines/mongodb.svg";
import mysql from "@/assets/engines/mysql.svg";
import postgres from "@/assets/engines/postgres.svg";
import redis from "@/assets/engines/redis.svg";
import snowflake from "@/assets/engines/snowflake.svg";
import sqlite from "@/assets/engines/sqlite.svg";
import sqlserver from "@/assets/engines/sqlserver.svg";
import turso from "@/assets/engines/turso.svg";

export interface NativeEngine {
  name: string;
  note: string;
  mark: ImageMetadata;
}

export const NATIVE_ENGINES: readonly NativeEngine[] = [
  {
    name: "PostgreSQL",
    note: "native: DBDelve speaks its wire protocol directly.",
    mark: postgres,
  },
  { name: "MySQL", note: "native.", mark: mysql },
  { name: "MariaDB", note: "native.", mark: mariadb },
  { name: "SQLite", note: "native, local files.", mark: sqlite },
  { name: "Turso", note: "native.", mark: turso },
  {
    name: "DuckDB",
    note: "native. Also opens CSV, Excel, Parquet and JSON files as queries.",
    mark: duckdb,
  },
  { name: "Snowflake", note: "native.", mark: snowflake },
  { name: "SQL Server", note: "native.", mark: sqlserver },
  { name: "MongoDB", note: "native.", mark: mongodb },
  { name: "Redis", note: "native, and so are Valkey, KeyDB and Dragonfly.", mark: redis },
  { name: "ClickHouse", note: "native.", mark: clickhouse },
];

export const ODBC_ENGINES: readonly string[] = [
  "IBM Db2",
  "Oracle",
  "SAP HANA",
  "SAP ASE",
  "Informix",
  "Teradata",
  "Vertica",
  "Exasol",
  "Firebird",
  "Redshift",
  "BigQuery",
  "Databricks",
  "Hive",
  "Trino",
  "Dremio",
  "and more",
];
