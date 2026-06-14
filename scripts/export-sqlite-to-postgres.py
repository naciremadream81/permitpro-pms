#!/usr/bin/env python3
"""
Export the SQLite production snapshot as Postgres INSERT statements.

Reads column types from the generated Postgres DDL
(supabase/migrations/20260612211348_init_permitpro_schema.sql) so SQLite's loose storage
(epoch-ms datetimes, 0/1 booleans) is cast correctly, and orders tables
topologically from the DDL's FOREIGN KEY constraints so inserts satisfy FKs.

Usage:
  python3 scripts/export-sqlite-to-postgres.py data/prod-snapshot-2026-06-12.db supabase/data
"""

import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

DDL = Path(__file__).resolve().parent.parent / "supabase/migrations/20260612211348_init_permitpro_schema.sql"


def parse_ddl(ddl_text):
    """table -> {column -> pg_type}, plus FK edges (table depends-on table)."""
    types, deps = {}, {}
    for m in re.finditer(r'CREATE TABLE "(\w+)" \((.*?)\n\);', ddl_text, re.S):
        table, body = m.group(1), m.group(2)
        cols = {}
        for line in body.splitlines():
            # Types are either bare keywords (TEXT, TIMESTAMP(3)) or quoted
            # enum names ("PermitType").
            cm = re.match(r'\s*"(\w+)"\s+("?\w+"?(?:\(\d+\))?(?: PRECISION)?)', line)
            if cm and cm.group(1) != "CONSTRAINT":
                cols[cm.group(1)] = cm.group(2).strip().rstrip(",")
        types[table] = cols
        deps.setdefault(table, set())
    for m in re.finditer(
        r'ALTER TABLE "(\w+)" ADD CONSTRAINT .*? FOREIGN KEY .*? REFERENCES "(\w+)"', ddl_text
    ):
        child, parent = m.group(1), m.group(2)
        if child != parent:
            deps.setdefault(child, set()).add(parent)
    return types, deps


def topo_order(deps):
    order, seen = [], set()

    def visit(t, stack=()):
        if t in seen:
            return
        if t in stack:
            return  # cycle: self/loop FKs handled by insert order best-effort
        for p in sorted(deps.get(t, ())):
            visit(p, stack + (t,))
        seen.add(t)
        order.append(t)

    for t in sorted(deps):
        visit(t)
    return order


def pg_literal(value, pg_type):
    if value is None:
        return "NULL"
    t = pg_type.upper()
    if t.startswith("BOOLEAN"):
        return "true" if value in (1, "1", True) else "false"
    if t.startswith("TIMESTAMP"):
        # Prisma stores SQLite datetimes as epoch milliseconds.
        if isinstance(value, (int, float)):
            dt = datetime.fromtimestamp(value / 1000.0, tz=timezone.utc)
            return "'" + dt.strftime("%Y-%m-%d %H:%M:%S.%f") + "+00'"
        return "'" + str(value).replace("'", "''") + "'"
    if t.startswith(("INTEGER", "BIGINT", "DOUBLE", "DECIMAL", "NUMERIC", "SMALLINT")):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "data/prod-snapshot-2026-06-12.db"
    out_dir = Path(sys.argv[2] if len(sys.argv) > 2 else "supabase/data")
    out_dir.mkdir(parents=True, exist_ok=True)

    ddl_text = DDL.read_text()
    types, deps = parse_ddl(ddl_text)
    order = topo_order(deps)

    db = sqlite3.connect(src)
    db.row_factory = sqlite3.Row
    total = 0
    for i, table in enumerate(order):
        if table not in types:
            continue
        try:
            rows = db.execute(f'SELECT * FROM "{table}"').fetchall()
        except sqlite3.OperationalError:
            continue  # table exists in target schema but not in old SQLite DB
        if not rows:
            continue
        cols = [c for c in rows[0].keys() if c in types[table]]
        col_list = ", ".join(f'"{c}"' for c in cols)
        lines = [f"-- {table}: {len(rows)} rows"]
        for row in rows:
            vals = ", ".join(pg_literal(row[c], types[table][c]) for c in cols)
            lines.append(
                f'INSERT INTO "{table}" ({col_list}) VALUES ({vals}) ON CONFLICT DO NOTHING;'
            )
        path = out_dir / f"{i:02d}_{table}.sql"
        path.write_text("\n".join(lines) + "\n")
        total += len(rows)
        print(f"{path.name}: {len(rows)} rows")
    print(f"done — {total} rows across {len(list(out_dir.glob('*.sql')))} files")


if __name__ == "__main__":
    main()
