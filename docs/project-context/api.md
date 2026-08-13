# API Index

<!-- ตาราง endpoint — index ชี้เข้าโค้ด ไม่ใช่ spec เต็ม · อัปเดตผ่าน /ugt-handoff เมื่อเพิ่ม/เปลี่ยน endpoint -->

## backend (Express, พอร์ต 3101)

| Method | Path | ทำอะไร | ไฟล์ | ใครเรียก |
| --- | --- | --- | --- | --- |
| GET | `/health` | liveness + DB check (`SELECT 1`) | `backend/src/index.ts` | Docker healthcheck |
| GET | `/api/box-types` | รายชื่อประเภทกล่องสำหรับ dropdown | `backend/src/routes/boxTypes.ts` | `frontend/lib/api.ts:fetchBoxTypes` |
| POST | `/api/inspection/predict` | ส่งรูป 1 มุม → proxy ไป ai-service → คืนผล LOCK/UNLOCK | `backend/src/routes/inspection.ts` | `frontend/lib/api.ts:predictImage` |
| POST | `/api/inspection` | บันทึกผลตรวจครบ 4 มุม + ผลรวม PASS/FAIL | `backend/src/routes/inspection.ts` | `frontend/lib/api.ts:submitInspection` |
| GET | `/api/inspection` | ค้นหา/แบ่งหน้าประวัติการตรวจ (lot_no/case_no) | `backend/src/routes/inspection.ts` | `frontend/app/records/page.tsx` |
| GET | `/api/uploads/:file` | เสิร์ฟรูปที่อัปโหลด (static) | `backend/src/index.ts` | `frontend/lib/api.ts:getImageUrl` |

## ai-service (FastAPI, พอร์ต 8000)

| Method | Path | ทำอะไร | ไฟล์ | ใครเรียก |
| --- | --- | --- | --- | --- |
| GET | `/health` | liveness (คืน mock flag ด้วย) | `ai-service/main.py` | Docker healthcheck |
| POST | `/predict` | รับรูป → YOLO/mock → ผล LOCK/UNLOCK/NO_DETECTION | `ai-service/main.py` | `backend/src/services/aiClient.ts` |

## frontend (Next.js, พอร์ต 3100)

| Method | Path | ทำอะไร | ไฟล์ | ใครเรียก |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | liveness ของ frontend เอง (ไม่เช็ค backend/ai-service) | `frontend/app/api/health/route.ts` | Docker healthcheck |
| * | `/api/*` | rewrite ไป backend (`BACKEND_URL`) | `frontend/next.config.ts` | browser (iPad) |
