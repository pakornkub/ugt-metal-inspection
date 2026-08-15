# Architecture — as-built

<!-- แผนที่ระบบตามที่เป็นจริงตอนนี้ — ทุกข้อชี้ไฟล์/โฟลเดอร์จริง · อัปเดตผ่าน /ugt-handoff
     เมื่องานเปลี่ยนโครงสร้าง -->

## Module map

ระบบเป็น 3 service แยกกันใน repo เดียว ไม่ใช่ Next.js app เดียวแบบมาตรฐาน ugt-nextjs ทั่วไป:

- `frontend/` — Next.js 16 App Router, UI สำหรับ iPad หน้างาน (สแกน QR → ถ่ายรูป 4 มุม → ส่งตรวจ AI → บันทึกผล)
- `backend/` — Express 5 + Prisma REST API, คุย SQL Server ตรง ๆ, proxy งานตรวจไปยัง ai-service
- `ai-service/` — Python FastAPI, รับรูป → YOLO model (หรือ mock) → ผล LOCK/UNLOCK/NO_DETECTION
- SQL Server — **server ที่มีอยู่แล้วขององค์กร ไม่ได้รันเป็น container** (เปลี่ยนจาก
  bundled mssql container 2026-08-13 — ดู decisions.md) เชื่อมผ่าน `DATABASE_URL`
  ใน `.env` เท่านั้น

## Data flow หลัก

- **ตรวจกล่อง**: iPad กล้อง/QR (`frontend/components/CameraCapture.tsx`,
  `QrLiveScanner.tsx`) → ถ่าย 4 มุม → `POST /api/inspection/predict` ทีละรูป
  (`frontend/lib/api.ts:predictImage`) → backend proxy
  (`backend/src/services/aiClient.ts`) → ai-service `/predict`
  (`ai-service/main.py`) → ผล LOCK/UNLOCK ต่อรูป → เมื่อครบ 4 รูป
  `POST /api/inspection` (`backend/src/routes/inspection.ts`) บันทึกผลรวม
  PASS/FAIL (`computeOverallResult`: ทุกรูป LOCK = PASS)
- **ค้นหาประวัติ**: `frontend/app/records/page.tsx` →
  `GET /api/inspection` (query lot_no/case_no) → `backend/src/routes/inspection.ts`

## ตารางหลัก → feature

| ตาราง | ของ feature | หมายเหตุ |
| --- | --- | --- |
| `BoxTypes` | dropdown ประเภทกล่อง | seed จาก `backend/prisma/seed.ts` (idempotent) — เดิมชื่อ `box_types`/คอลัมน์ camelCase, เปลี่ยนเป็น PascalCase (ตาราง+คอลัมน์) 2026-08-13 ตาม `ugt-nextjs-database-setup` |
| `BoxInspections` | บันทึกผลตรวจ 4 รูป + ผลรวม | เดิมชื่อ `box_inspection`/คอลัมน์ snake_case, เปลี่ยนเป็น PascalCase (ตาราง+คอลัมน์) 2026-08-13 — `@map` ใน `backend/prisma/schema.prisma` คุมชื่อคอลัมน์จริงใน DB, ส่วน Prisma field ในโค้ดยังเป็น camelCase (`lotNo`) ตามปกติ — **API JSON response ยังส่ง snake_case เหมือนเดิม** (`lot_no`) เพราะ route แปลงคีย์ก่อนส่งอยู่แล้ว (`backend/src/routes/inspection.ts`) ไม่กระทบ frontend |

## Testing map

- `frontend/lib/api.test.ts` — วิ่งด้วย `cd frontend && npm run test:coverage` (vitest + jsdom)
- `backend/src/services/storage.test.ts` — วิ่งด้วย `cd backend && npm run test:coverage` (vitest + node env)
- `ai-service` ยังไม่มี test suite (มีแค่ ruff lint) — เพิ่ม pytest ถ้าโค้ดโตกว่านี้

## ⚠ Deviations จากมาตรฐาน ugt-nextjs ทั่วไป (พบตอนติดตั้ง CI/CD, 2026-08-13)

- **โครงสร้าง 3 service ไม่ใช่ Next.js app เดียว** — Jenkinsfile/sonar-project.properties
  ปรับ path เป็น multi-service เอง ไม่ตรง org template ตรง ๆ
- **ไม่มีระบบ login** — ผู้ใช้เลือกไม่ติดตั้ง auth (หน้างานเปิด ไม่มีการยืนยันตัวตน)
- **มี basePath `/ugt-metal-inspection` (prod) / `/ugt-metal-inspection-dev` (dev)** —
  เข้าผ่าน `https://ugtweb.ube.co.th/` — ทุก service ต่อ external network
  `proxy-network` (ต้องมีอยู่แล้วบน Docker host ก่อน `docker compose up` —
  ไม่ได้สร้างจาก compose นี้ ถ้าไม่มี compose จะ error ทันที) — frontend ยัง
  publish host port ตรงไว้ด้วยสำหรับ iPad บน LAN โรงงาน (กล้อง/QR ไม่อยากผ่าน
  proxy กลาง)
- **`prisma db push` ไม่ใช่ `migrate deploy`** — ไม่มี `prisma/migrations/` เลย, backend
  container รัน `db push && db seed` ทุกครั้งที่ start (ทั้งสอง idempotent) แทนขั้นตอน migrate
  แยกใน Jenkins Deploy stage
- **SQL Server ไม่ได้ bundle เป็น container** — `docker-compose.yml`/`.dev.yml`
  ไม่มี service `mssql` แล้ว (ลบออก 2026-08-13) เชื่อมต่อ server ที่มีอยู่แล้วของ
  องค์กรผ่าน `DATABASE_URL` ใน `.env` (Jenkins credential `env-ugt-metal-inspection`)
  แทน — ดู decisions.md
- **ชื่อ database (`UGT_MetalInspection`/`UGT_MetalInspection_DEV`) ไม่ตรงกับ
  ชื่อตาราง** — ปรับชื่อ**ตารางและคอลัมน์**เป็น PascalCase แล้ว (ตาม
  `ugt-nextjs-database-setup`) แต่ database เองตั้งชื่อแยกต่างหาก ตาม SQL Server
  จริง (`10.1.0.22`) ที่ DBA จัดสรรให้ — DBA/admin ต้องสร้าง database นี้เองก่อน
  ใช้งานจริง (ดู `docs/admin-handoff.md` §4, ไม่ใช่ auto-create จาก `prisma db push`)
- **`url` อยู่ใน `schema.prisma` datasource block ตรง ๆ** ไม่ใช่ `prisma.config.ts`
  ตามมาตรฐาน `ugt-nextjs-database-setup` เต็มรูปแบบ (ซึ่งต้องมี driver adapter
  `@prisma/adapter-mssql` + `prisma.config.ts` ด้วย) — **because** โปรเจคนี้ใช้
  Prisma 6 classic pattern อยู่แล้ว ทำงานได้ปกติไม่ต้องมี adapter, การย้ายทั้งระบบ
  ไปใช้ adapter pattern (+ `@t3-oss/env-nextjs` ซึ่งเป็นของ Next.js ล้วน ใช้กับ
  Express ตรง ๆ ไม่ได้ด้วย) เป็นงานใหญ่เกินขอบเขตที่ขอ (ปรับแค่ naming ของคอลัมน์)
