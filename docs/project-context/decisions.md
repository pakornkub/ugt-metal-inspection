# Decisions — append-only

<!-- มติทุกเรื่อง ยกเว้น design (→ docs/DESIGN.md §10) · append ผ่าน /ugt-handoff
     ห้ามแก้/ลบย้อนหลัง — จะกลับมติ = เพิ่มรายการใหม่อ้างถึงของเก่า -->

- 2026-08-13 ติดตั้ง org-standard CI/CD (Jenkins 10-stage + SonarQube + OWASP +
  Docker) แบบปรับสำหรับ repo 3 service แทนการบังคับให้เป็น Next.js app เดียว
  ตาม template เดิม — **because** โครงสร้างจริงคือ frontend/backend/ai-service
  แยกกัน คนละภาษา คนละ Dockerfile · rejected: รวมเป็น Next.js app เดียวด้วย API
  routes (ต้องเขียนใหม่ทั้ง backend/ai-service ทิ้งของเดิมที่ทำงานอยู่แล้ว)
- 2026-08-13 ไม่ติดตั้งระบบ login/auth — **because** ผู้ใช้ระบุว่าหน้างาน iPad
  ใช้ในไลน์การผลิต ไม่มีการกล่าวถึงระบบสมาชิกใน README เดิม · rejected: SSO/LDAP/Local
  (เพิ่ม friction ให้ inspector หน้างานโดยไม่มีความจำเป็นที่ระบุไว้)
- 2026-08-13 [ยกเลิกโดยรายการถัดไป] ไม่มี basePath — สมมติฐานผิด แก้แล้วในรายการ
  2026-08-13 ถัดมา
- 2026-08-13 มี basePath `/ugt-metal-inspection` (prod) / `/ugt-metal-inspection-dev`
  (dev) เข้าผ่านโดเมนที่เตรียมไว้แล้ว `https://ugtweb.ube.co.th/` — **because**
  ผู้ใช้แจ้งแก้ไขว่ามี nginx เตรียมพร้อมบนเซิร์ฟเวอร์อีกตัว ตั้ง basePath ตามชื่อ
  folder/repo (`ugt-metal-inspection`) · rejected: `proxy-network: external`
  แบบ org template เต็มรูปแบบ (nginx อยู่คนละเครื่องกับ Docker host ของระบบนี้
  ไม่ใช่ container ร่วม docker network เดียวกัน จึงต่อกันด้วย IP:port ผ่าน network
  ปกติแทน — frontend ยัง publish host port ตรงไว้ด้วยสำหรับ iPad บน LAN โรงงาน)
- 2026-08-13 mssql ใช้ Docker named volume ต่อ ไม่ย้ายเป็น bind mount ใต้
  `/srv/appdata` ตามข้อกำหนด org ทั่วไป — **because** official mssql image
  ต้องการเจ้าของไฟล์เป็น uid ภายใน container เอง (10001), bind mount บน host
  เสี่ยง permission ผิดโดยไม่มีเครื่องมือแก้ในสคริปต์นี้ · rejected: bind mount +
  chown อัตโนมัติ (ใช้ได้กับ image ของเราเองที่รู้ uid แน่นอน แต่ไม่ปลอดภัยพอสำหรับ
  image ทางการที่ควบคุม uid เองภายใน) — `uploads` (ข้อมูลของแอปเราเอง) ยังใช้
  bind mount ตามมาตรฐานปกติ
- 2026-08-13 ไม่เพิ่มขั้นตอน `prisma migrate deploy` แยกใน Jenkins Deploy stage —
  **because** โปรเจคนี้ไม่มี `prisma/migrations/` เลย ใช้ `prisma db push` มาตั้งแต่ต้น
  (ทั้ง push และ seed เป็น idempotent, รันอยู่แล้วใน backend container CMD ทุกครั้งที่
  start) · rejected: บังคับสร้างระบบ migration ใหม่ทั้งหมด (นอกขอบเขตงาน "ทำให้ deploy ได้")
- 2026-08-13 เปลี่ยนชื่อตาราง `box_types`→`BoxTypes`, `box_inspection`→`BoxInspections`
  (PascalCasePlural) ใน `backend/prisma/schema.prisma` (`@@map`) — **because**
  ผู้ใช้ขอให้ปรับให้สอดคล้อง MSSQL best practices ก่อนสร้าง database จริงครั้งแรก
  (ยังไม่มีข้อมูลจริง เปลี่ยนตอนนี้ปลอดภัยที่สุด) · rejected: ปรับชื่อคอลัมน์ด้วย
  (เช่น `lot_no`→`LotNo`) — คอลัมน์เหล่านี้เป็น wire format เดียวกับ JSON response
  ที่ frontend ใช้ตรง ๆ (`frontend/lib/api.ts` types) เปลี่ยนจะกระทบ API contract
  ทั้งระบบ นอกขอบเขตที่ขอ (ผู้ใช้พูดถึง "ชื่อตาราง" ไม่ใช่ "ชื่อคอลัมน์") — ทำได้ถ้า
  ต้องการ แต่ต้องคุยแยกเพราะกระทบ frontend ด้วย
- 2026-08-13 database (`box_inspection`/`box_inspection_dev`) ให้ทีมพัฒนา/admin
  สร้างเองล่วงหน้า (มือ, ผ่าน `CREATE DATABASE`) ไม่ปล่อยให้ `prisma db push`
  auto-create — **because** ผู้ใช้ยืนยันต้องการคุมการสร้าง database เป็นขั้นตอน
  ของ admin โดยเฉพาะ (governance/naming) · rejected: ปล่อย auto-create ทั้งหมด
  (เร็วกว่าแต่ผู้ใช้ปฏิเสธไปแล้ว) — ยังคงเชื่อมต่อ mssql container ที่ bundle
  มากับ compose เหมือนเดิม ไม่ได้เปลี่ยนไปใช้ SQL Server ภายนอก
  **[แก้ไขบางส่วนโดยรายการถัดไป — mssql container ถูกลบออกไปแล้ว]**
- 2026-08-13 ลบ service `mssql` ออกจาก `docker-compose.yml`/`.dev.yml` ทั้งหมด —
  เชื่อมต่อ SQL Server ที่มีอยู่แล้วขององค์กรแทน ผ่าน `DATABASE_URL` ใน `.env`
  (Jenkins credential `env-box-inspection`/`-dev`) — **because** ผู้ใช้ยืนยันมี
  SQL Server server อยู่แล้ว ไม่ต้อง deploy เอง · rejected: เก็บ mssql container
  ไว้ต่อ (สมมติฐานเดิม ก่อนผู้ใช้แก้ไข) — ผลตาม: ลบ `DB_PORT`/`DB_PASSWORD`/
  `mssql_data` volume ออกจากทั้ง 2 compose ไฟล์, ตัด `depends_on: mssql` จาก
  backend, `docs/admin-handoff.md` §4 เปลี่ยนจาก "สร้าง database บน container
  ของเรา" เป็น "ขอ database เปล่า + DATABASE_URL จาก DBA/admin" การตัดสินใจก่อนหน้า
  เรื่อง named-volume/permission ของ mssql (รายการ 2026-08-13 ก่อนหน้านี้) ไม่มีผล
  อีกต่อไปเพราะไม่มี mssql container ให้ named volume แล้ว
- 2026-08-13 ปรับชื่อ**คอลัมน์**เป็น PascalCase ด้วย (ต่อจากตารางในรายการก่อนหน้า)
  ตาม `ugt-nextjs-database-setup` — เช่น `lot_no`→`LotNo` (`@map` ใน
  `backend/prisma/schema.prisma`), Prisma field ในโค้ดเปลี่ยนเป็น camelCase
  (`lotNo`) — **because** ผู้ใช้ยืนยันชัดเจนขอปรับ "col" ให้เป็น standard SQL
  Server หลัง `/ugt-nextjs-platform:ugt-nextjs-database-setup` ยืนยัน convention
  (Column: PascalCase) · rejected: ทำ full org standard ทั้งชุด (`prisma.config.ts`
  + `@prisma/adapter-mssql` + audit columns `CreatedBy/UpdatedBy/IsActive/IsDeleted`
  + `@t3-oss/env-nextjs`) — เกินขอบเขตที่ขอมาก, audit columns ไม่มีความหมายเพราะ
  ระบบนี้ไม่มี auth (ไม่มี actor ให้ attribute CreatedBy/UpdatedBy), `@t3-oss/env-nextjs`
  เป็นของ Next.js ใช้กับ Express backend ตรง ๆ ไม่ได้ · **API JSON response ยังคง
  ส่งคีย์แบบ snake_case เหมือนเดิม** (route แปลงคีย์ก่อนส่งอยู่แล้วใน
  `backend/src/routes/inspection.ts`) — frontend ไม่ต้องแก้อะไรเลย ตรวจสอบแล้วว่า
  `tsc --noEmit`/tests/`build` ผ่านหมดหลังเปลี่ยน
- 2026-08-13 [แก้ไขบางส่วนโดยรายการถัดไป] network ของทุก service ใน docker-compose
  เป็น network ภายในโปรเจค (`box-inspection-network`/`-dev-network`) ไม่ใช่
  `proxy-network: external` แบบ org template — สมมติฐานผิด แก้แล้วในรายการถัดมา
- 2026-08-13 เปลี่ยนทุก service ใน `docker-compose.yml`/`.dev.yml` ให้ต่อ external
  network `proxy-network` แทน network ภายในโปรเจค (ทั้ง prod และ dev ใช้ชื่อเดียวกัน
  ไม่มี `-dev` suffix) — **because** ผู้ใช้ยืนยันมี `proxy-network` สร้างไว้แล้วบน
  Docker host ให้ใช้แทน · rejected: เก็บ network แยกต่อโปรเจค (สมมติฐานเดิม) —
  ผลตาม: compose ต้องมี `proxy-network` อยู่แล้วบน host ก่อน `docker compose up`
  เสมอ (ไม่งั้น error ทันทีเพราะ `external: true`) — เพิ่มเป็นข้อเช็คใน
  `docs/admin-handoff.md`
- 2026-08-15 ผู้ใช้สร้าง `.env`/`.env.dev` จริงที่ root เอง (ไม่ใช่ template
  placeholder แล้ว) — DB จริงคือ `10.1.0.22`, database ชื่อ
  `UGT_MetalInspection`/`UGT_MetalInspection_DEV` (**ไม่ใช่** `box_inspection`
  ตามที่เอกสารเดิมสมมติไว้ — sync `docs/admin-handoff.md`/`architecture.md`
  ให้ตรงแล้ว) · port จริง prod 3022/3023/3024 (frontend/backend/ai), dev
  3025/3026/3027 (ไม่ใช่ default 3100-3111/8000-8010 ในโค้ด) — sync nginx
  location block ใน admin-handoff.md ให้ชี้ port เหล่านี้แล้ว ·
  `trustServerCertificate=true` ในทั้งสองไฟล์ (ยอมรับความเสี่ยง skip cert
  validation กับ SQL Server บน LAN ภายใน — ไม่ได้ทักท้วง ถือเป็นการตัดสินใจของ
  ผู้ใช้เอง) — ยืนยันด้วย `docker compose config` แล้วว่าทั้งสองไฟล์ resolve
  ถูกต้อง ไม่มี syntax error
- 2026-08-16 เปลี่ยนชื่อ project identifier (technical/infra) จาก `box-inspection`
  เป็น `ugt-metal-inspection` ทั่วทั้ง repo — container/image names,
  `container_name`, appdata bind mount path (`/srv/appdata/ugt-metal-inspection`),
  Jenkins credential ID (`env-ugt-metal-inspection`/`-dev`), SonarQube
  projectKey/projectName, root/backend `package.json` "name", temp upload dir
  ใน `backend/src/middleware/upload.ts` — **because** ผู้ใช้ระบุให้ตรงกับชื่อ
  repo/folder จริง (`ugt-metal-inspection`) แทน `box-inspection` ที่เป็นชื่อเดิม
  ก่อนย้ายมาอยู่ใต้ org · rejected: เปลี่ยน UI/display text ด้วย
  (หัวข้อหน้าเว็บ "Box Inspection" ใน `frontend/app/layout.tsx`/`page.tsx`,
  README title, FastAPI docs title ใน `ai-service/main.py`) — ผู้ใช้ชี้เฉพาะ
  ชื่อใน `docker-compose.yml` (infra identifier) ไม่ได้ขอเปลี่ยนชื่อ product ที่
  ผู้ใช้เห็นบนจอ ถ้าต้องการเปลี่ยนด้วยค่อยแยกคุย — DB name
  (`UGT_MetalInspection`) ไม่กระทบ เพราะเป็นคนละ concept กับ project identifier
  นี้อยู่แล้ว (ตั้งไว้ก่อนหน้าแล้วในรายการ 2026-08-15)
  **[ส่วน "rejected" ด้านบนถูกกลับมติโดยรายการถัดไป — ผู้ใช้ขอให้เปลี่ยนด้วย]**
- 2026-08-16 เปลี่ยน UI/display text ที่เหลือจาก "Box Inspection" เป็น
  "UGT Metal Inspection" ด้วย — `frontend/app/page.tsx` (`<h1>`),
  `frontend/app/layout.tsx` (metadata title/appleWebApp title),
  `ai-service/main.py` (FastAPI `title=`), `README.md` (H1 + project-structure
  diagram แก้ `TSL_AI/` → `ugt-metal-inspection/` ด้วยเพราะผิดอยู่แล้วก่อนหน้านี้)
  — **because** ผู้ใช้ขอให้แก้ "เอกสารทั้งหมด" หลังเห็นว่ารอบก่อนแยก
  infra/product ไว้ · ไม่ได้แตะ: คำว่า "box inspection" ตัวพิมพ์เล็กที่เป็น
  generic description (README บรรทัดแรกที่บรรยาย, `board.md` feature row) —
  ไม่ใช่ proper noun ของ product ชื่อ ถือเป็นคำบรรยายกิจกรรมตามปกติ ไม่ใช่แบรนด์
- 2026-08-16 Jenkins job เป็น **2 Pipeline job ธรรมดาแยกกัน** (`ugt-metal-inspection`
  ชี้ `*/main`, `ugt-metal-inspection-dev` ชี้ `*/develop`) ไม่ใช่ Multibranch
  Pipeline เดี่ยวที่ auto-discover ทุก branch แบบเดิม — **because** ผู้ใช้ระบุ
  ต้องการแบบนี้ (เหตุผลไม่ได้ระบุ — อาจเพื่อคุม permission/notification/URL
  แยกกันชัดเจนต่อ environment) · rejected: Multibranch Pipeline เดียว (เดิม —
  ง่ายกว่าตรงที่เพิ่ม branch ใหม่แล้ว auto-discover เอง แต่ผู้ใช้ปฏิเสธไปแล้ว)
  · **Jenkinsfile ไม่ต้องแก้โค้ดเลย** เพราะ branch-detection เดิมใช้
  `env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last()` อยู่แล้ว ซึ่ง
  `GIT_BRANCH` (เช่น `origin/main`) คือค่าที่ Pipeline job ธรรมดาตั้งให้เอง
  (ต่าง Multibranch ที่ตั้ง `BRANCH_NAME` แทน) — แก้แค่ `docs/admin-handoff.md`
  §1.2 ให้สอนสร้าง 2 job + §1.3 อธิบายว่า webhook เดียวใช้ร่วมกันได้
- 2026-08-16 ทุก bind mount ใน `docker-compose.yml`/`.dev.yml` ต้องเป็น
  **absolute `/srv/appdata/...` path เท่านั้น ห้าม relative path** — ย้าย
  `ai-service`'s `./ai-service/models:/app/models` (relative) เป็น
  `/srv/appdata/<project>(-dev)/models` (absolute) — **because** เจอจริงจาก
  `docker compose up` ที่ Deploy stage fail ด้วย DooD bug เดียวกับที่เจอใน AI
  lint stage ก่อนหน้า (Jenkins คุยกับ host Docker daemon ผ่าน `docker.sock`,
  relative path resolve ผิดไปเป็น path ข้างใน container ของ Jenkins เอง) ·
  rejected: ลบ volume ทิ้งแล้ว COPY โมเดลเข้า image ตอน build แทน (ไฟล์โมเดล
  ใหญ่และถูก `.gitignore` ไว้โดยตั้งใจ ไม่อยากให้ต้อง rebuild image ทุกครั้งที่
  เปลี่ยนโมเดล) — เพิ่ม `mkdir -p .../models` ใน Jenkinsfile Deploy stage +
  เตือนชัดเจนใน `docs/admin-handoff.md` §3 ว่าต้องเอาไฟล์โมเดลไปวางเองก่อน
  deploy ครั้งแรก ไม่งั้น ai-service crash loop ตั้งแต่ start (ไม่ fallback เป็น
  mock ให้เอง เพราะ compose ตั้ง `AI_MOCK: "false"` ตายตัว) — รายละเอียดเต็ม →
  `docs/project-context/troubleshooting.md`
