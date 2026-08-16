# Troubleshooting — เฉพาะโปรเจคนี้

<!-- อาการ → สาเหตุ → วิธีแก้ ของปัญหาที่เคยกินเวลาจริงในโปรเจคนี้ · เขียนผ่าน /ugt-handoff
     ทันทีที่ debug จบ (ตอนรายละเอียดยังสด)
     กติกาสำหรับ AI: เจอ error แปลก — เปิดไฟล์นี้ก่อนเริ่ม debug
     เลื่อนชั้น: ถ้าพิสูจน์ได้ว่าเป็นปัญหาระดับ stack (ทุกโปรเจคบน stack นี้เจอ)
     → เปิด PR ยกขึ้น skill pitfalls ของ platform repo แล้วลบออกจากที่นี่
     — ความรู้ไหลขึ้นทางเดียว ไม่เก็บซ้ำสองที่ -->

- **`AI Service` lint stage fails: `docker: Error response from daemon: error
  while creating mount source path '/var/jenkins_home/workspace/.../ai-service':
  mkdir /var/jenkins_home: read-only file system`** → Jenkins รันอยู่ใน
  container ของตัวเอง แต่คุยกับ Docker daemon ของ **host** ผ่าน `docker.sock`
  (Docker-outside-of-Docker) — คำสั่งเดิม `docker run -v "$PWD/ai-service:/app"`
  bind mount path `$PWD` ที่มีอยู่จริงแค่ใน container ของ Jenkins เอง ไม่ได้อยู่
  บน host จริง daemon เลยพยายามสร้าง path นั้นบน host filesystem จริงแล้ว fail
  (root fs ของ host เป็น read-only ตรงนั้น) → แก้โดยเปลี่ยนจาก `docker run -v`
  (bind mount) เป็น `docker build` (context ถูก stream ผ่าน Docker API แทน
  ไม่ต้อง bind mount เลย จึงไม่มีปัญหา path นี้ — เหตุผลเดียวกับที่ Docker Build
  stage ท้าย pipeline ไม่เคยเจอปัญหานี้) ดู `Jenkinsfile` stage `AI Service`
  (2026-08-16)

- **`docker compose up` fails at Deploy stage: `Error response from daemon:
  error while creating mount source path '/var/jenkins_home/workspace/.../
  ai-service/models': mkdir /var/jenkins_home: read-only file system`** →
  same root cause as the entry above (Docker-outside-of-Docker), different
  spot: `ai-service`'s volume was `./ai-service/models:/app/models` — a
  **relative** path, which Compose resolves against `$PWD` (Jenkins' own
  container workspace, not the real host) → fails the same way. The
  `uploads` bind mount never had this problem because it already used an
  **absolute** `/srv/appdata/...` path, which Compose uses literally (works
  fine as long as that path genuinely exists on the real host — see
  `docs/admin-handoff.md` §3's warning about not preparing `/srv/appdata`
  from inside the Jenkins container by mistake) → fixed by moving `models`
  to the same absolute `/srv/appdata/<project>(-dev)/models` pattern in both
  `docker-compose.yml`/`.dev.yml`, plus `mkdir -p` for it in the Jenkinsfile
  Deploy stage. **General rule for this repo: every bind mount in
  docker-compose.yml/.dev.yml must be an absolute `/srv/appdata/...` path —
  never a relative repo path** — Jenkins-in-Docker means relative paths are
  never safe here. (2026-08-16)

_(more as they come up)_
