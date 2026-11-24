# คู่มือการนำเว็บ “แสงคงคา” ขึ้นใช้งานจริง (Supabase PostgreSQL + Cloud Deploy)

โปรเจกต์นี้ถูกตั้งค่าให้พร้อมใช้งานจริงแบบ **0 Mock Data** (เริ่มนับจาก 0 จริงทุกสถานที่) และรองรับการเก็บข้อมูลบน **Supabase PostgreSQL** โดยไม่ต้องลงไลบรารีเพิ่มเติม (Zero-dependency Node.js 24)

---

## ขั้นที่ 1: สร้างฐานข้อมูลฟรีบน Supabase (ใช้เวลา ~2 นาที)

1. สมัครและสร้างโปรเจกต์ใหม่ที่ [https://supabase.com](https://supabase.com) (เลือก Region เป็น **Singapore `ap-southeast-1`** เพื่อให้เร็วที่สุดในไทย)
2. เมื่อสร้างเสร็จ เข้าไปที่เมนูด้านซ้าย **SQL Editor → New Query**
3. เปิดไฟล์ `supabase/schema.sql` ในโปรเจกต์นี้ คัดลอก SQL ทั้งหมดไปวาง แล้วกดปุ่ม **Run**
   - สคริปต์จะสร้างตาราง `krathongs`, `blessings_log`, `festival_counters` (เริ่มจาก 0)
   - เปิด Row Level Security (RLS) อัตโนมัติ
   - สร้าง Postgres RPC แบบ Atomic (`bless_krathong`, `increment_festival_counter`, `get_festival_stats`) เพื่อรองรับคนกดพร้อมกันจำนวนมาก
4. ไปที่เมนู **Project Settings → API** แล้วคัดลอกค่า 2 ตัวนี้เก็บไว้:
   - **Project URL** → เอาไว้ใส่ใน `SUPABASE_URL`
   - **service_role (secret key)** → เอาไว้ใส่ใน `SUPABASE_SERVICE_ROLE_KEY`
   > ⚠️ ห้ามนำ `service_role` key ไปใส่ในโค้ดฝั่งหน้าเว็บ (`public/`) หรืออัปขึ้น GitHub เด็ดขาด! ใส่เฉพาะใน `.env` หรือช่อง Environment Variables ของโฮสต์เท่านั้น

---

## ขั้นที่ 2: ทดสอบเชื่อม Supabase จากเครื่องของคุณก่อน (ไม่บังคับแต่แนะนำ)

1. คัดลอกไฟล์ `.env.example` เป็น `.env`
2. ใส่ค่า `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` ลงใน `.env`
3. รันเซิร์ฟเวอร์:
   ```bash
   node server.js
   ```
4. หากเชื่อมต่อสำเร็จ ใน Terminal จะขึ้นข้อความ:
   ```text
   🌕 แสงคงคา (Saeng Khongkha) running at http://localhost:3000
   🗄️  Database: Supabase PostgreSQL (Cloud Production)
   ```
5. ลองเปิด `http://localhost:3000` แล้วชูตกระทงใบแรก ข้อมูลจะถูกบันทึกลงตาราง `krathongs` บน Supabase ทันที!

---

## ขั้นที่ 3: นำเว็บขึ้นออนไลน์จริง (เลือกได้ 3 ค่ายยอดนิยม)

ทุกค่ายด้านล่างรองรับไฟล์ `Dockerfile` ในโปรเจกต์นี้โดยอัตโนมัติ และให้ลิงก์ **HTTPS** ทันที:

### ตัวเลือก A: Railway (ง่ายที่สุด แนะนำ! ~2 นาที)
1. นำโฟลเดอร์ `d:\Krathong` ขึ้น GitHub Repository (ไฟล์ `.gitignore` ป้องกัน `.env` และ `data/` ไว้แล้ว)
2. เข้า [https://railway.app](https://railway.app) → **New Project → Deploy from GitHub Repo** → เลือก Repo ของคุณ
3. Railway จะตรวจเจอ `Dockerfile` และ Build ให้อัตโนมัติ
4. เข้าไปที่แท็บ **Variables** แล้วเพิ่มค่า 3 ตัว:
   - `SUPABASE_URL` = *(URL จาก Supabase)*
   - `SUPABASE_SERVICE_ROLE_KEY` = *(service_role key จาก Supabase)*
   - `PUBLIC_BASE_URL` = *(โดเมนที่ได้จาก Railway เช่น `https://saeng-khongkha.up.railway.app`)*
5. ไปที่แท็บ **Settings → Networking → Generate Domain** เพื่อรับลิงก์ HTTPS สำหรับแชร์ให้คนทั่วโลกเข้าเล่นได้เลย!

### ตัวเลือก B: Render
1. เข้า [https://render.com](https://render.com) → **New → Web Service** → เชื่อม GitHub Repo
2. เลือก Environment เป็น **Docker** และ Health Check Path เป็น `/api/health`
3. ใส่ Environment Variables ทั้ง 3 ตัวเหมือนด้านบน (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_BASE_URL`) แล้วกด **Create Web Service**

### ตัวเลือก C: Fly.io / VPS ส่วนตัว (Docker)
```bash
docker build -t saeng-khongkha .
docker run -d --name saeng-khongkha --restart unless-stopped \
  -p 3000:3000 \
  -e SUPABASE_URL="https://xxxx.supabase.co" \
  -e SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  -e PUBLIC_BASE_URL="https://loykrathong.yourdomain.com" \
  saeng-khongkha
```

---

## ขั้นที่ 4: ตรวจสอบพรีวิวแชร์ลง LINE / Facebook (Open Graph)

เมื่อได้ลิงก์ HTTPS จริงแล้ว:
- เว็บมีระบบ **Dynamic Open Graph** อยู่ใน `server.js` พร้อมภาพปก `public/og-card.jpg`
- **แชร์หน้าหลัก** (`https://yourdomain.com/`): แสดงภาพปกแม่น้ำเจ้าพระยาวัดอรุณฯ พร้อมคำเชิญชวน
- **แชร์ลิงก์กระทงเฉพาะใบ** (`https://yourdomain.com/?krathong=kr_xxxxx`): ดึง **ชื่อผู้ลอย + คำอธิษฐานจริงจาก Supabase** มาใส่ใน `og:title` และ `og:description` อัตโนมัติ!
- สามารถเทสและล้างแคชพรีวิวได้ที่:
  - LINE: [https://poker.line.naver.jp](https://poker.line.naver.jp)
  - Facebook: [https://developers.facebook.com/tools/debug/](https://developers.facebook.com/tools/debug/)
