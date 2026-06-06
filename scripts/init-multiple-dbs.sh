#!/bin/bash
# MeCare — Postgres init: tạo DB riêng cho baserow và n8n trong 1 engine chung.
# Chạy tự động bởi postgres image (/docker-entrypoint-initdb.d) lúc init lần đầu.
set -euo pipefail

create_db() {
  local db="$1"
  echo "[init-multiple-dbs] tạo database '$db' nếu chưa có"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE "$db"'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
}

create_db "${POSTGRES_BASEROW_DB:-baserow}"
create_db "${POSTGRES_N8N_DB:-n8n}"
