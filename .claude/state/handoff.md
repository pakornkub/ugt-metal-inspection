# Handoff

Last updated: 2026-08-13

<!-- ของสด: งานถึงไหน คิวอะไรต่อ ติดคำถามอะไร — โหลดเข้า context ทุก session ผ่าน
     CLAUDE.md import · อัปเดตผ่าน /ugt-handoff ตอนจบทุก work chunk (แม้พรุ่งนี้จะ
     ทำต่อเอง) แล้ว commit
     ความรู้ถาวรไม่อยู่ไฟล์นี้ → docs/project-context/ (มติ → decisions.md ·
     error ที่เคยเจอ → troubleshooting.md · กติกา as-built → business-rules.md)
     ห้ามใส่ secrets / ค่า .env — ไฟล์นี้ถูก commit -->

## In progress

- Nothing in progress (harness install just completed)

## Next

- สร้าง `develop` branch จาก `main` (ยังไม่มีเลย — Jenkins multibranch ต้อง discover ทั้งคู่)
- ส่ง `docs/admin-handoff.md` ให้ทีม admin/DevOps ตั้ง Jenkins job + credentials +
  SonarQube projects/webhook + ยืนยัน port 8 ช่อง (prod ×4 + dev ×4) + IP เครื่องที่
  รัน docker compose (สำหรับตั้ง nginx proxy_pass ที่ `https://ugtweb.ube.co.th/`)
  + สร้าง database `box_inspection`/`box_inspection_dev` เอง (§4 ในไฟล์)
- Push ไป `develop` branch ครั้งแรก → เฝ้าดู pipeline ผ่านครบ 10 stage
- (ทางเลือก) เพิ่ม pytest ให้ `ai-service` — ตอนนี้ไม่มี test suite เลย มีแค่ ruff lint
- (ทางเลือก) สร้าง `.env`/`.env.dev` local ที่ root สำหรับทดสอบ docker-compose
  ก่อน push จริง — compose ทุกตัวมี default ให้ครบแล้ว ไม่บังคับต้องมี

## Open Questions

- _(none yet)_

## Done (newest first — keep only ~10; older history lives in git and board.md)

- 2026-08-13 ติดตั้ง org CI/CD ผ่าน `/ugt-nextjs-full-setup` (เฉพาะ Quality + CI/CD —
  ไม่ติดตั้ง Database/Design/Auth/Mail/Upload เพราะมีอยู่แล้วหรือไม่ต้องการ):
  Jenkinsfile 10 stage ปรับสำหรับ 3 service, sonar-project.properties multi-source,
  owasp-suppressions.xml, docker-compose.yml/.dev.yml (healthcheck + image tag +
  uploads bind mount), health endpoint ทั้ง 3 service, vitest/eslint/prettier/husky
  ทั้ง frontend และ backend, ruff config สำหรับ ai-service, docs/project-context/
  ทั้ง 7 ไฟล์, docs/admin-handoff.md
