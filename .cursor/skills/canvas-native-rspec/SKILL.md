---
name: canvas-native-rspec
description: >-
  Run Canvas LMS Ruby specs and Rails tasks on the host (not inside docker compose
  web) with Postgres, Redis, and required ENV. Use when the user asks to run
  bin/rspec, bundle exec rails db:migrate in test, fix POSTGRES_PASSWORD or
  database.yml KeyError, set up native Canvas test DB, or run specs without
  the full web container.
---

# Canvas native RSpec / test DB (host)

Use this when running **`bin/rspec`** or **`bundle exec rails … RAILS_ENV=test`** from the repo on the machine shell (e.g. Cursor agent), not via `docker compose run web`.

## Prerequisites

- **Ruby** and **Bundler** matching `Gemfile.lock` (e.g. Ruby **3.4.1** via mise).
- **Node 20+** and **Yarn 1.x** per `package.json` `engines` (for JS tests; not required for RSpec alone).
- **APT / OS**: native gem build deps; for Canvas also **`libxmlsec1-dev`**, **`libidn11-dev`**, **`postgresql-client`** (Rails runs **`psql`** to load `db/structure.sql` during migrations / prepare).
- **Disk**: a full root volume breaks image pulls and Yarn; **`docker system prune -af`** may be needed first.

## Environment variables (`.env` is gitignored)

Append or export (same values as default `docker-compose.yml` / override examples):

| Variable | Typical value | Purpose |
|----------|----------------|---------|
| `POSTGRES_PASSWORD` | `sekret` | `config/database.yml` uses `ENV.fetch('POSTGRES_PASSWORD')` |
| `CANVAS_DATABASE_HOST` | `127.0.0.1` | Host Postgres when DB is published on localhost (not hostname `postgres`) |
| `ENCRYPTION_KEY` | `facdd3a131ddd8988b14f6e4e01039c93cfa0160` | `config/security.yml` ERB; required for boot |

Shell pattern before Rails/RSpec:

```bash
export PATH="$HOME/.local/bin:$PATH"   # if using mise
eval "$(mise activate bash)"
cd /path/to/canvas-lms
set -a && . ./.env && set +a
```

Keep existing **`COMPOSE_FILE=…`** lines in `.env` if present; add the rows above.

## Postgres (Docker is fine; must match Canvas expectations)

- Image: **`pgvector/pgvector:pg14`** (aligns with `docker-compose/postgres` style and extensions).
- Publish **5432**, `POSTGRES_PASSWORD` matching `.env`.
- On **`template1`**: `CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;` so new DBs inherit it.
- Create databases: **`canvas_test`**, **`canvas_test_shard_1`**, **`canvas_test_shard_2`** (see `config/database.yml` test section).

## Redis

`config/redis.yml` test URL uses host **`redis`**. On the host, either:

- add **`127.0.0.1 redis`** to **`/etc/hosts`**, and run **Redis** on **6379** (e.g. `docker run -p 6379:6379 redis:alpine`), or  
- run everything inside compose where the hostname `redis` resolves.

## One-time / refresh test DB

```bash
RAILS_ENV=test DISABLE_SPRING=1 bundle exec rails db:migrate
RAILS_ENV=test DISABLE_SPRING=1 bundle exec rake ci:prepare_test_shards
```

Use **`DISABLE_SPRING=1`** when Spring causes stale or confusing failures.

## Run specs

```bash
DISABLE_SPRING=1 bin/rspec path/to/spec.rb
```

## Yarn / `node_modules` permissions

If **`yarn install`** fails with **EACCES** under the repo, fix ownership (e.g. after Docker wrote root-owned files): **`sudo chown -R "$(whoami):$(whoami)" .`** in the repo root.

## Reference

- Full Docker workflow: `doc/docker/developing_with_docker.md` (e.g. `docker compose exec web bundle exec rspec`).
- This skill: **host** Postgres + env vars + shards for **`bin/rspec`** without the `web` image.
