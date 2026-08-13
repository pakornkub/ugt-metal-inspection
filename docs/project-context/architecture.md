# Architecture — as-built

<!-- แผนที่ระบบตามที่เป็นจริงตอนนี้ — ทุกข้อชี้ไฟล์/โฟลเดอร์จริง · อัปเดตผ่าน /ugt-handoff
     เมื่องานเปลี่ยนโครงสร้าง -->

## Module map

ระบบเป็น 3 service แยกกันใน repo เดียว ไม่ใช่ Next.js app เดียวแบบมาตรฐาน ugt-nextjs ทั่วไป:

- `frontend/` — Next.js 16 App Router, UI สำหรับ iPad หน้างาน (สแกน QR → ถ่ายรูป 4 มุม → ส่งตรวจ AI → บันทึกผล)
- `backend/` — Express 5 + Prisma REST API, คุย SQL Server ตรง ๆ, proxy งานตรวจไปยัง ai-service
- `ai-service/` — Python FastAPI, รับรูป → YOLO model (หรือ mock) → ผล LOCK/UNLOCK/NO_DETECTION
- `mssql` — SQL Server 2017 container ของระบบเอง (ไม่ใช่ DB กลางองค์กร) ตั้งใน docker-compose.yml

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
| `BoxTypes` | dropdown ประเภทกล่อง | seed จาก `backend/prisma/seed.ts` (idempotent) — เดิมชื่อ `box_types`, เปลี่ยนเป็น PascalCase 2026-08-13 |
| `BoxInspections` | บันทึกผลตรวจ 4 รูป + ผลรวม | เดิมชื่อ `box_inspection`, เปลี่ยนเป็น PascalCase 2026-08-13 — **คอลัมน์ยังเป็น snake_case** (`lot_no`, `case_no`, ...) ไม่ได้แตะ เพราะเป็น wire format เดียวกับ API/frontend อยู่ |

## Testing map

- `frontend/lib/api.test.ts` — วิ่งด้วย `cd frontend && npm run test:coverage` (vitest + jsdom)
- `backend/src/services/storage.test.ts` — วิ่งด้วย `cd backend && npm run test:coverage` (vitest + node env)
- `ai-service` ยังไม่มี test suite (มีแค่ ruff lint) — เพิ่ม pytest ถ้าโค้ดโตกว่านี้

## ⚠ Deviations จากมาตรฐาน ugt-nextjs ทั่วไป (พบตอนติดตั้ง CI/CD, 2026-08-13)

- **โครงสร้าง 3 service ไม่ใช่ Next.js app เดียว** — Jenkinsfile/sonar-project.properties
  ปรับ path เป็น multi-service เอง ไม่ตรง org template ตรง ๆ
- **ไม่มีระบบ login** — ผู้ใช้เลือกไม่ติดตั้ง auth (หน้างานเปิด ไม่มีการยืนยันตัวตน)
- **มี basePath `/ugt-metal-inspection` (prod) / `/ugt-metal-inspection-dev` (dev)** —
  เข้าผ่าน `https://ugtweb.ube.co.th/` ที่มี nginx อยู่คนละเครื่องกับ Docker host
  ของระบบนี้ (ต่อกันผ่าน network ธรรมดา ไม่ใช่ Docker network ร่วม จึงไม่ใช้
  `proxy-network: external` แบบ org template) — frontend ยัง publish host port
  ตรงไว้ด้วยสำหรับ iPad บน LAN โรงงาน (กล้อง/QR ไม่อยากผ่าน proxy กลาง)
- **`prisma db push` ไม่ใช่ `migrate deploy`** — ไม่มี `prisma/migrations/` เลย, backend
  container รัน `db push && db seed` ทุกครั้งที่ start (ทั้งสอง idempotent) แทนขั้นตอน migrate
  แยกใน Jenkins Deploy stage
- **mssql ใช้ Docker named volume ไม่ใช่ bind mount ใต้ `/srv/appdata`** — image ทางการ
  ต้องการ uid ภายในของตัวเอง, bind mount เสี่ยง permission ผิด (ดู decisions.md)
- **ชื่อ database (`box_inspection`/`box_inspection_dev`) ยังเป็น snake_case** —
  ปรับเฉพาะชื่อ**ตาราง**เป็น PascalCase ตามคำขอ ไม่ได้แตะชื่อ database เพราะ
  DATABASE_URL ที่มีอยู่ (docker-compose.yml) อ้างชื่อนี้อยู่แล้ว เปลี่ยนจะกระทบ
  ทุกที่ที่อ้างถึง — ต้องสร้าง database นี้เองก่อนใช้งานจริง (ดู
  `docs/admin-handoff.md` §4, ไม่ใช่ auto-create จาก `prisma db push`)
