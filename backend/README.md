# Google Sheets API Integration

โปรเจคนี้เชื่อมต่อกับ Google Sheets ผ่าน Google Sheets API

## การตั้งค่า

### 1. สร้าง Google Cloud Project และ Service Account

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้างโปรเจคใหม่หรือเลือกโปรเจคที่มีอยู่
3. เปิดใช้งาน Google Sheets API:
   - ไปที่ "APIs & Services" > "Library"
   - ค้นหา "Google Sheets API"
   - คลิก "Enable"

### 2. สร้าง Service Account

1. ไปที่ "APIs & Services" > "Credentials"
2. คลิก "Create Credentials" > "Service Account"
3. ตั้งชื่อ Service Account และคลิก "Create"
4. ข้าม Grant Access (คลิก "Continue" และ "Done")
5. คลิกที่ Service Account ที่สร้างขึ้น
6. ไปที่แท็บ "Keys"
7. คลิก "Add Key" > "Create New Key"
8. เลือก JSON และคลิก "Create"
9. ไฟล์ JSON จะถูกดาวน์โหลด (อย่า commit ไฟล์นี้ขึ้น Git!)

### 2.1 ตั้งค่าผ่าน .env (แนะนำ)
คัดลอกค่าต่อไปนี้จากไฟล์ JSON แล้วใส่ในไฟล์ `.env`

```
GOOGLE_SPREADSHEET_ID=YOUR_SPREADSHEET_ID
GOOGLE_CLIENT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
# วางกุญแจแบบบรรทัดเดียว โดยแทน newline ด้วย \n
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> หมายเหตุ: ใน `.env` ห้ามใส่บรรทัดใหม่จริง ๆ ในค่า `GOOGLE_PRIVATE_KEY` ให้ใช้ `\n` แทนทุกบรรทัด

หากตั้งค่า `.env` ครบแล้ว ไม่จำเป็นต้องเก็บ `credentials.json` ในโปรเจกต์อีกต่อไป

### 3. แชร์ Google Sheet ให้กับ Service Account

1. เปิดไฟล์ `credentials.json` และคัดลอก email ของ Service Account (client_email)
2. เปิด Google Sheet ที่ต้องการใช้งาน
3. คลิก "Share" และแชร์ให้กับ email ของ Service Account
4. ให้สิทธิ์ "Editor" ถ้าต้องการเขียนข้อมูล หรือ "Viewer" ถ้าแค่อ่าน
5. คัดลอก Spreadsheet ID จาก URL (ส่วนระหว่าง /d/ และ /edit)
   - ตัวอย่าง: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

## การติดตั้ง

```bash
npm install
```

## การรันเซิร์ฟเวอร์

```bash
node index.js
```

เซิร์ฟเวอร์จะรันที่ `http://localhost:3000`

## API Endpoints

### 1. อ่านข้อมูลจาก Google Sheets
```
GET /read?spreadsheetId=YOUR_SHEET_ID&range=Sheet1!A1:D10
```

**ตัวอย่าง:**
```bash
curl "http://localhost:3000/read?spreadsheetId=YOUR_SHEET_ID&range=Sheet1!A1:D10"
```

### 2. เขียนข้อมูลลง Google Sheets
```
POST /write
Content-Type: application/json

{
  "spreadsheetId": "YOUR_SHEET_ID",
  "range": "Sheet1!A1",
  "values": [
    ["Name", "Age", "Email"],
    ["John Doe", "25", "john@example.com"]
  ]
}
```

**ตัวอย่าง:**
```bash
curl -X POST http://localhost:3000/write \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetId": "YOUR_SHEET_ID",
    "range": "Sheet1!A1",
    "values": [["Name", "Age"], ["John", "25"]]
  }'
```

### 3. เพิ่มข้อมูลต่อท้าย Google Sheets
```
POST /append
Content-Type: application/json

{
  "spreadsheetId": "YOUR_SHEET_ID",
  "range": "Sheet1!A1",
  "values": [
    ["Jane Doe", "30", "jane@example.com"]
  ]
}
```

**ตัวอย่าง:**
```bash
curl -X POST http://localhost:3000/append \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetId": "YOUR_SHEET_ID",
    "range": "Sheet1!A1",
    "values": [["Jane", "30"]]
  }'
```

## หมายเหตุ

- อย่าลืมเพิ่ม `credentials.json` ลงใน `.gitignore` เพื่อความปลอดภัย
- Spreadsheet ID สามารถหาได้จาก URL ของ Google Sheets
- Range ใช้รูปแบบ A1 notation เช่น "Sheet1!A1:D10"

## การแก้ปัญหา

### ข้อผิดพลาด: "The caller does not have permission"
- ตรวจสอบว่าได้แชร์ Google Sheet ให้กับ Service Account แล้ว
- ตรวจสอบว่าได้ให้สิทธิ์ที่เหมาะสมแล้ว (Editor สำหรับการเขียน)

### ข้อผิดพลาด: "Unable to read credentials file"
- ตรวจสอบว่าไฟล์ `credentials.json` อยู่ในโฟลเดอร์โปรเจค
- ตรวจสอบว่าไฟล์ JSON ถูกต้องและไม่เสียหาย
# backend-v89
