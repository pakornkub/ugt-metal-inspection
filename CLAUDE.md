<!-- ugt:start — this block is owned by `ugt-nextjs-full-setup` and may be rewritten wholesale on /plugin update.
     Put project-specific content OUTSIDE the markers or it will be lost on update.
     (HTML comments are stripped before entering context, so they cost no tokens.) -->

## Stack

3 service แยกกันใน repo เดียว — **ไม่ใช่** Next.js app เดียวแบบมาตรฐาน ugt-nextjs ทั่วไป
(ดู `docs/project-context/architecture.md` § Deviations):

- `frontend/` — Next.js 16 App Router + TypeScript + Tailwind
- `backend/` — Express 5 + Prisma → SQL Server
- `ai-service/` — Python FastAPI + Ultralytics YOLO (มี mock mode)
- CI/CD: Jenkins + SonarQube + OWASP Dependency-Check + Docker Compose (ปรับสำหรับ 3 service)

ไม่มีระบบ login · basePath `/ugt-metal-inspection` (prod) / `/ugt-metal-inspection-dev`
(dev) ผ่าน nginx เครื่องอื่น (`https://ugtweb.ube.co.th/`) — ดูเหตุผลใน
`docs/project-context/decisions.md`

## Commands

```bash
cd frontend && npm run dev            # frontend dev server (port 3100)
cd backend && npm run dev             # backend dev server (port 3101)
npm run dev:ai                        # ai-service dev (port 8000, จาก root)

cd frontend && npm run build          # ต้องผ่านก่อน push
cd backend && npm run build

cd frontend && npm run lint && npm run format:check && npm run test:coverage
cd backend && npm run lint && npm run format:check && npm run test:coverage
docker run --rm -v "$PWD/ai-service:/app" -w /app python:3.11-slim sh -c "pip install ruff && ruff check ."

docker compose up --build             # ทั้งระบบ (mssql + ai-service + backend + frontend)
```

## Rules that break the build every time

- แก้ `backend/prisma/schema.prisma` แล้วต้อง `cd backend && npx prisma generate`
  ก่อน `npx tsc --noEmit`/build เสมอ — ไม่งั้น Prisma Client เป็น stub type `any`
  ทั้งก้อน (ไม่ error ตรงจุด ไปโผล่เป็น "implicit any" ที่ query อื่นแทน)
- โปรเจคนี้ใช้ `prisma db push` ไม่ใช่ `migrate` — ห้ามสร้าง `prisma/migrations/`
  โดยไม่คุยก่อน (จะขัดกับ `db push` ที่ backend container รันทุกครั้งที่ start)
- `frontend/eslint.config.mjs` และ `backend/eslint.config.mjs` แยกกัน คนละ config
  คนละ quote style ทั้งคู่ (`singleQuote: false` — ของเดิมในโค้ดเป็น double quote)
- Pre-commit hook อยู่ที่ root `.husky/pre-commit` (`cd frontend/backend && npx lint-staged`
  ตามลำดับ) — husky ติดตั้งที่ root package.json เท่านั้น ไม่ใช่ใน frontend/backend
- New TS/TSX/Python code ต้องผ่าน SonarQube Quality Gate รอบแรก (`new_violations = 0`,
  `new_coverage >= 60%` — ดู `sonar-project.properties`)

## Team state + project knowledge (committed to the repo)

@.claude/state/handoff.md

@docs/project-context/00-index.md

- **Treat committed files as the latest truth** — on conflict with auto memory,
  they win (auto memory is machine-local, not shared with the team)
- **Call `/ugt-handoff` at the end of every work chunk** — it updates the
  handoff file + feature board + affected `docs/project-context/` files; commit
  the whole set together
- ก่อนเสนอเปลี่ยนแนวทาง/lib/โครงสร้าง → เช็ค `docs/project-context/decisions.md`
  ก่อนว่าเคยเคาะไปแล้วหรือยัง — ถ้าขัดมติเดิม ให้ยกขึ้นมาคุย ไม่ทำเงียบ ๆ
- เจอ error แปลก → เปิด `docs/project-context/troubleshooting.md` ก่อนเริ่ม debug
- Keep `handoff.md` short (~60 lines) — it loads into context every session

## Model mode (subagent routing)

@.claude/state/model-mode.md

- Follow that table when dispatching subagents or spawning teammates · switch
  preset with `/ugt-model-mode easy|default|god|auto` · main session model stays the
  user's `/model`

## Where new knowledge goes

- Work state (ค้างไหน คิวอะไร คำถามค้าง) → `.claude/state/handoff.md`
- True only for this project → the matching `docs/project-context/` file
  (มติ → `decisions.md` · error ที่เคยเจอ → `troubleshooting.md` · กติกา as-built
  → `business-rules.md` · โครงสร้าง → `architecture.md`)
- True for every project on this stack → open a PR against `ugt-claude-platform`
  — never edit installed skill files (plugin cache, deleted on update)
- Personal preference → auto memory

<!-- ugt:end -->
