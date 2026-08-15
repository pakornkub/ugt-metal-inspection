# Handoff

Last updated: 2026-08-16

<!-- ของสด: งานถึงไหน คิวอะไรต่อ ติดคำถามอะไร — โหลดเข้า context ทุก session ผ่าน
     CLAUDE.md import · อัปเดตผ่าน /ugt-handoff ตอนจบทุก work chunk (แม้พรุ่งนี้จะ
     ทำต่อเอง) แล้ว commit
     ความรู้ถาวรไม่อยู่ไฟล์นี้ → docs/project-context/ (มติ → decisions.md ·
     error ที่เคยเจอ → troubleshooting.md · กติกา as-built → business-rules.md)
     ห้ามใส่ secrets / ค่า .env — ไฟล์นี้ถูก commit -->

## In progress

- Nothing in progress (CI/CD harness install just completed)

## Next

- สร้าง `develop` branch จาก `main` (ยังไม่มีเลย — Jenkins multibranch ต้อง discover ทั้งคู่)
- ส่ง `docs/admin-handoff.md` ให้ทีม admin/DevOps — ค่าจริงส่วนใหญ่ตั้งไว้แล้วใน
  `.env`/`.env.dev` (DB `10.1.0.22`, port 3022-3027) เหลือแค่รอ **ยืนยัน**:
  ไม่ชน port ระบบอื่น, `UGT_MetalInspection`/`_DEV` สร้างจริงบน SQL Server แล้ว,
  `proxy-network` มีอยู่บน Docker host, IP เครื่องที่รัน compose (สำหรับ nginx)
- Push ไป `develop` branch ครั้งแรก → เฝ้าดู pipeline ผ่านครบ 10 stage
- (ทางเลือก) เพิ่ม pytest ให้ `ai-service` — ตอนนี้ไม่มี test suite เลย มีแค่ ruff lint

## Open Questions

- _(none yet)_

## Done (newest first — keep only ~10; older history lives in git and board.md)

- 2026-08-16 เปลี่ยนชื่อ project identifier (infra เท่านั้น) จาก `box-inspection`
  เป็น `ugt-metal-inspection` ทั่ว repo — container/image names, appdata path,
  Jenkins credential ID, sonar key/name, package.json name ×2 (+ regenerate
  lockfile), temp upload dir — **ไม่ได้แตะ** UI text/README/FastAPI docs title
  ที่ยังเป็น "Box Inspection" (product branding แยกจาก infra id, ผู้ใช้ไม่ได้ขอ)
- 2026-08-15 ผู้ใช้สร้าง `.env`/`.env.dev` จริงที่ root — DB `10.1.0.22`,
  database `UGT_MetalInspection`/`_DEV`, port จริง 3022-3024 (prod)/3025-3027
  (dev) ไม่ใช่ default ในโค้ด — sync `docs/admin-handoff.md` (nginx proxy_pass,
  ตาราง port, DB name) + `architecture.md`/`decisions.md` ให้ตรงแล้ว ยืนยันด้วย
  `docker compose config` ว่า resolve ถูกต้อง
- 2026-08-13 เปลี่ยน network ทุก service เป็น external `proxy-network` (มีอยู่แล้ว
  บน Docker host) แทน network ภายในโปรเจค · เพิ่ม `.env.example` root
- 2026-08-13 ลบ mssql container ออกจาก docker-compose (ต่อ SQL Server องค์กรแทน)
  + ปรับ `backend/prisma/schema.prisma` ทั้งตาราง+คอลัมน์เป็น PascalCase ตาม
  `ugt-nextjs-database-setup` — API JSON response ยังส่ง snake_case เหมือนเดิม
  ไม่กระทบ frontend, verify แล้ว tsc/lint/format/test/build ผ่านหมด
- 2026-08-13 ติดตั้ง org CI/CD ผ่าน `/ugt-nextjs-full-setup` (เฉพาะ Quality + CI/CD):
  Jenkinsfile 10 stage ปรับสำหรับ 3 service, sonar-project.properties
  multi-source, owasp-suppressions.xml, docker-compose ×2 (healthcheck + image
  tag + uploads bind mount), health endpoint ทั้ง 3 service, vitest/eslint/
  prettier/husky ทั้ง frontend+backend, ruff config ai-service,
  docs/project-context/ ทั้ง 7 ไฟล์, docs/admin-handoff.md
