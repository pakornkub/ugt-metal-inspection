# Business Rules — as-built

<!-- กติกา business ที่ระบบ "ทำจริงตอนนี้" — เขียนเพิ่มเมื่อ feature ✅ done ผ่าน /ugt-handoff -->

## การตรวจกล่อง (inspection)

- ต้องถ่ายครบ **4 มุม** ต่อ 1 กล่องก่อนบันทึกผลได้ — implement ที่ `frontend/app/page.tsx`
- ผลรวม **PASS** เฉพาะเมื่อทั้ง 4 รูปเป็น LOCK, ไม่งั้น **FAIL** — implement ที่
  `backend/src/routes/inspection.ts:computeOverallResult`
- AI มี 3 ผลลัพธ์ต่อรูป: `LOCK` / `UNLOCK` / `NO_DETECTION` — implement ที่
  `ai-service/predictor.py` (`Result` type)
- โหมด mock (ไม่มีโมเดลจริง): ผลถูกกำหนดแบบ deterministic จาก md5 hash ของรูป
  (คู่ = LOCK, คี่ = UNLOCK) — `ai-service/predictor.py:_mock_predict`

## Lot/Case number

- แยกจาก QR หรือกรอกมือ ต้องมีตัวเลขอย่างน้อย **9 หลัก** — เอา 9 หลักท้ายสุด
  แบ่งเป็น lot 6 หลัก + case 3 หลัก — implement ที่ `frontend/lib/api.ts:parseLotCaseNumber`
- น้อยกว่า 9 หลัก → ถือว่า parse ไม่ได้ (คืน `null`) — ต้องกรอกมือ

## ประเภทกล่อง (box types)

- ค่าเริ่มต้น 6 ประเภท: Gps5, Cimc, Gp1, Nikken, Eneos, Anqing — seed ที่
  `backend/prisma/seed.ts` (idempotent — เช็คมีอยู่ก่อนค่อยสร้าง)
- ชื่อเก่า "Aneos" (สะกดผิด) ถูก migrate เป็น "Eneos" อัตโนมัติตอน seed
  (rename by id, ไม่ลบแล้วสร้างใหม่ — คง id/position เดิม)
