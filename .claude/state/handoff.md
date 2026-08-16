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
  (3 จุดแล้ว: AI lint stage, `ai-service` models volume relative path, และ
  **`/srv/appdata` ใช้ไม่ได้เลยเพราะ server `docker02` ลง Docker ผ่าน snap —
  ย้ายไป `/home/docker02/appdata` แทนแล้ว** — ดู Done + `troubleshooting.md`)
  — รอ push แล้วดูว่าผ่าน Deploy stage หรือติดจุดอื่นอีก **กติกาที่ตั้งไว้แล้ว:
  bind mount ทุกจุดต้องเป็น absolute path บน host จริง ห้าม relative — และบน
  server `docker02` โดยเฉพาะ ต้องใช้ `/home/docker02/appdata` ไม่ใช่
  `/srv/appdata`** (ดู architecture.md § Deviations)

## Next

- Push commit ที่แก้แล้ว (Jenkinsfile, docker-compose ×2, admin-handoff.md —
  ย้าย path เป็น `/home/docker02/appdata`) ไป `develop` → ดู pipeline รันต่อ
  ถ้าเจอ error ใหม่ เปิด `troubleshooting.md` ก่อน
- **ต้องเอาไฟล์โมเดล (`.pt`/`.onnx`) ไปวางที่
  `/home/docker02/appdata/ugt-metal-inspection-dev/models` บน host จริงก่อน**
  ไม่งั้น ai-service crash loop ตั้งแต่ start (compose ตั้ง `AI_MOCK: "false"`)
- (ทางเลือก, แก้ที่ต้นเหตุจริง) ถอด snap docker บน `docker02` ติดตั้ง `docker-ce`
  ใหม่ — จะได้เลิกผูก deploy path กับ user account เฉพาะเจาะจง กลับไปใช้
  `/srv/appdata` มาตรฐานองค์กรได้
- ส่ง `docs/admin-handoff.md` ให้ทีม admin/DevOps ยืนยันส่วนที่เหลือ: ไม่ชน port
  ระบบอื่น, `UGT_MetalInspection`/`_DEV` สร้างจริงบน SQL Server แล้ว,
  `proxy-network` มีอยู่แล้ว, IP เครื่องที่รัน compose (สำหรับ nginx)
- ทำ job `ugt-metal-inspection` (prod, ชี้ `*/main`) ให้เสร็จด้วยถ้ายังไม่ได้ทำ
  (ตอนนี้เห็นแค่ job dev รันอยู่)
- (ทางเลือก) เพิ่ม pytest ให้ `ai-service` — ตอนนี้ไม่มี test suite เลย มีแค่ ruff lint

## Open Questions

- _(none yet)_

## Done (newest first — keep only ~10; older history lives in git and board.md)

- 2026-08-16 แก้ pipeline แดงจริง 3 จุดต่อเนื่องที่ job `ugt-metal-inspection-dev`
  ทั้งหมดเกี่ยวกับ Docker-outside-of-Docker (Jenkins รันใน container คุยกับ
  Docker daemon ของ host ผ่าน `docker.sock`): (1) AI lint stage ใช้ `docker
  run -v $PWD:/app` → เปลี่ยนเป็น `docker build` (2) `ai-service`'s `models`
  volume เป็น relative path → เปลี่ยนเป็น absolute (3) **`/srv/appdata` เข้าไม่ได้
  เลยเพราะ server `docker02` ลง Docker ผ่าน Snap (AppArmor บล็อก `/srv`,
  พิสูจน์ด้วย `sudo touch` ผ่านแต่ `docker run -v /srv/...` fail)** → ย้าย
  persistent-data path ทั้งหมดเป็น `/home/docker02/appdata/...` แทน (เฉพาะ
  server นี้) แก้ `docker-compose.yml`/`.dev.yml`/`Jenkinsfile`/
  `admin-handoff.md` §3 ครบ — แก้ที่ต้นเหตุจริง (ถอด snap ติดตั้ง docker-ce)
  ยังไม่ได้ทำ รายละเอียดเต็ม → `docs/project-context/troubleshooting.md`
- 2026-08-16 Jenkins job เปลี่ยนจาก Multibranch Pipeline เดี่ยว → 2 Pipeline
  job แยกกัน (`ugt-metal-inspection` ชี้ `*/main`, `-dev` ชี้ `*/develop`) ·
  เปลี่ยนชื่อ project identifier จาก `box-inspection` เป็น `ugt-metal-inspection`
  ทั่ว repo ทั้ง infra และ UI/product text
- 2026-08-15 ผู้ใช้สร้าง `.env`/`.env.dev` จริงที่ root — DB `10.1.0.22`,
  database `UGT_MetalInspection`/`_DEV`, port จริง 3022-3024 (prod)/3025-3027
  (dev) — sync เอกสารทั้งหมดแล้ว
- 2026-08-13 ติดตั้ง org CI/CD ผ่าน `/ugt-nextjs-full-setup` ทั้งชุด (Jenkinsfile
  10 stage, sonar-project.properties, docker-compose ×2, vitest/eslint/prettier,
  docs/project-context/ ครบ) · ต่อมา: ลบ mssql container, ปรับ schema.prisma
  เป็น PascalCase, เปลี่ยน network เป็น external `proxy-network`
