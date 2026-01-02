# @repo/auth

## Core Workflow (Most Used)

### Generate SQL migrations from schema changes

```bash
drizzle-kit generate
```

### Apply migrations to the database

```bash
drizzle-kit migrate
```

---

## Local Development

### Push schema directly (no migrations)

```bash
drizzle-kit push
```

Use this for fast local iteration.

---

## Database ↔ Schema Sync

### Pull schema from existing database

```bash
drizzle-kit pull
```

Use when starting with an existing DB.

---

## Debug & Tools

### Open Drizzle Studio (DB UI)

```bash
drizzle-kit studio
```

### Check migrations for conflicts

```bash
drizzle-kit check
```

### Upgrade migration snapshots

```bash
drizzle-kit up
```

---

## Recommended Usage Rules

- **Production** → `generate` → `migrate`
- **Local dev** → `push`
- **Existing DB** → `pull`
- **Before deploy** → `check`

---

## Minimal Daily Flow

```bash
drizzle-kit generate
drizzle-kit migrate
```
