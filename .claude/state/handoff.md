# Handoff

Last updated: 2026-08-16

<!-- ของสด: งานถึงไหน คิวอะไรต่อ ติดคำถามอะไร — โหลดเข้า context ทุก session ผ่าน
     CLAUDE.md import · อัปเดตผ่าน /ugt-handoff ตอนจบทุก work chunk (แม้พรุ่งนี้จะ
     ทำต่อเอง) แล้ว commit
     ความรู้ถาวรไม่อยู่ไฟล์นี้ → docs/project-context/ (มติ → decisions.md ·
     error ที่เคยเจอ → troubleshooting.md · กติกา as-built → business-rules.md)
     ห้ามใส่ secrets / ค่า .env — ไฟล์นี้ถูก commit -->

## In progress

- **Jenkins job `ugt-metal-inspection-dev` กำลังรันจริงแล้ว** (branch `develop`
  มีอยู่แล้ว, job สร้างแล้ว) — กำลังไล่แก้ DooD bug ทีละจุดที่ pipeline แดง
  (2 จุดแล้ว: AI lint stage, `ai-service` models volume — ดู Done +
  `troubleshooting.md`) — รอ push แล้วดูว่าผ่าน Deploy stage หรือติดจุดอื่นอีก
  **กติกาที่ตั้งไว้แล้ว: bind mount ทุกจุดต้องเป็น absolute `/srv/appdata/...`
  ห้าม relative path** (ดู architecture.md § Deviations) — เช็คจุดอื่นที่อาจ
  ยังพลาดกติกานี้อยู่ด้วยถ้าเจอ error คล้ายเดิมอีก

## Next

- Push commit ที่แก้แล้ว (Jenkinsfile AI lint + models volume path) ไป
  `develop` → ดู pipeline รันต่อ ถ้าเจอ error ใหม่ เปิด `troubleshooting.md` ก่อน
- **ต้องเอาไฟล์โมเดล (`.pt`/`.onnx`) ไปวางที่
  `/srv/appdata/ugt-metal-inspection-dev/models` บน host จริงก่อน** ไม่งั้น
  ai-service crash loop ตั้งแต่ start (compose ตั้ง `AI_MOCK: "false"` ตายตัว)
- ส่ง `docs/admin-handoff.md` ให้ทีม admin/DevOps ยืนยันส่วนที่เหลือ: ไม่ชน port
  ระบบอื่น, `UGT_MetalInspection`/`_DEV` สร้างจริงบน SQL Server แล้ว,
  `proxy-network` + `/srv/appdata` (บน host จริง!) มีอยู่แล้ว, IP เครื่องที่รัน
  compose (สำหรับ nginx)
- ทำ job `ugt-metal-inspection` (prod, ชี้ `*/main`) ให้เสร็จด้วยถ้ายังไม่ได้ทำ
  (ตอนนี้เห็นแค่ job dev รันอยู่)
- (ทางเลือก) เพิ่ม pytest ให้ `ai-service` — ตอนนี้ไม่มี test suite เลย มีแค่ ruff lint

## Open Questions

- _(none yet)_

## Done (newest first — keep only ~10; older history lives in git and board.md)

- 2026-08-16 แก้ pipeline แดงจริง 2 จุดที่ job `ugt-metal-inspection-dev` —
  ทั้งคู่สาเหตุเดียวกัน (Jenkins รันใน container คุยกับ Docker daemon ของ host
  ผ่าน `docker.sock` = DooD): (1) AI Service lint stage ใช้ `docker run -v
  $PWD:/app` bind mount → เปลี่ยนเป็น `docker build` (context stream ผ่าน API
  แทน) (2) `ai-service`'s `./ai-service/models` เป็น relative path → เปลี่ยน
  เป็น absolute `/srv/appdata/<project>(-dev)/models` + เพิ่ม `mkdir -p` ใน
  Jenkinsfile Deploy stage + เตือนชัดใน `docs/admin-handoff.md` §3 ว่าต้องเอา
  ไฟล์โมเดลไปวางเองบน host จริง ไม่งั้น ai-service crash loop — ตั้งกติกาไว้ใน
  `architecture.md`: bind mount ทุกจุดต้องเป็น absolute `/srv/appdata/...`
  เท่านั้น รายละเอียดเต็ม → `docs/project-context/troubleshooting.md`
- 2026-08-16 Jenkins job เปลี่ยนจาก Multibranch Pipeline เดี่ยว → **2 Pipeline
  job แยกกัน** (`ugt-metal-inspection` ชี้ `*/main`, `-dev` ชี้ `*/develop`) —
  Jenkinsfile ไม่ต้องแก้ (fallback `env.GIT_BRANCH` รองรับอยู่แล้ว) แก้แค่
  `docs/admin-handoff.md` §1.2/1.3
- 2026-08-16 เปลี่ยนชื่อ project identifier จาก `box-inspection` เป็น
  `ugt-metal-inspection` ทั่ว repo ทั้ง infra (container/image/credential/sonar
  key/package.json) และ UI/product text (หน้าเว็บ, README, FastAPI docs title)
  — verify แล้ว build/lint ผ่านหมด
- 2026-08-15 ผู้ใช้สร้าง `.env`/`.env.dev` จริงที่ root — DB `10.1.0.22`,
  database `UGT_MetalInspection`/`_DEV`, port จริง 3022-3024 (prod)/3025-3027
  (dev) — sync เอกสารทั้งหมดแล้ว ยืนยันด้วย `docker compose config`
- 2026-08-13 ติดตั้ง org CI/CD ผ่าน `/ugt-nextjs-full-setup` ทั้งชุด (Jenkinsfile
  10 stage, sonar-project.properties, docker-compose ×2, vitest/eslint/prettier,
  docs/project-context/ ครบ) · ต่อมา: ลบ mssql container, ปรับ schema.prisma
  เป็น PascalCase, เปลี่ยน network เป็น external `proxy-network`
