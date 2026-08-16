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
  มีอยู่แล้ว, job สร้างแล้ว) — กำลังไล่แก้ทีละจุดที่ pipeline แดง ล่าสุดแก้
  AI Service lint stage (ดู Done ด้านล่าง + `troubleshooting.md`) — รอ push
  แล้วดูว่าผ่าน stage ถัดไปหรือติดตรงไหนอีก

## Next

- Push commit ที่แก้ Jenkinsfile (AI Service lint) ไป `develop` → ดู pipeline
  รันต่อจากจุดที่เคยแดง ถ้าเจอ error ใหม่ เปิด `troubleshooting.md` ก่อน
- ส่ง `docs/admin-handoff.md` ให้ทีม admin/DevOps ยืนยันส่วนที่เหลือ: ไม่ชน port
  ระบบอื่น, `UGT_MetalInspection`/`_DEV` สร้างจริงบน SQL Server แล้ว,
  `proxy-network` มีอยู่บน Docker host, IP เครื่องที่รัน compose (สำหรับ nginx)
- ทำ job `ugt-metal-inspection` (prod, ชี้ `*/main`) ให้เสร็จด้วยถ้ายังไม่ได้ทำ
  (ตอนนี้เห็นแค่ job dev รันอยู่)
- (ทางเลือก) เพิ่ม pytest ให้ `ai-service` — ตอนนี้ไม่มี test suite เลย มีแค่ ruff lint

## Open Questions

- _(none yet)_

## Done (newest first — keep only ~10; older history lives in git and board.md)

- 2026-08-16 แก้ pipeline แดงจริงที่ job `ugt-metal-inspection-dev`: AI Service
  lint stage ใช้ `docker run -v $PWD:/app` (bind mount) ซึ่ง fail เพราะ Jenkins
  รันใน container คุยกับ Docker daemon ของ host (DooD) — เปลี่ยนเป็น
  `docker build` (context stream ผ่าน API ไม่ bind mount) แทน รายละเอียดเต็ม →
  `docs/project-context/troubleshooting.md`
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
- 2026-08-13 ติดตั้ง org CI/CD ผ่าน `/ugt-nextjs-full-setup` (Quality + CI/CD):
  Jenkinsfile 10 stage ปรับสำหรับ 3 service, sonar-project.properties
  multi-source, docker-compose ×2, health endpoint ครบ, vitest/eslint/prettier
  ทั้ง frontend+backend, ruff ai-service, docs/project-context/ ครบ,
  docs/admin-handoff.md · ต่อมา: ลบ mssql container (ต่อ SQL Server องค์กรแทน),
  ปรับ schema.prisma เป็น PascalCase, เปลี่ยน network เป็น external `proxy-network`
