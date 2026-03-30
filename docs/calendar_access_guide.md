# 🎯 Panduan Akses Fitur Kalender

Fitur Kalender telah berhasil ditambahkan ke berbagai tempat di aplikasi untuk memudahkan akses. Berikut adalah panduan lengkapnya:

---

## 📱 Cara Mengakses Fitur Kalender

### 1️⃣ **Dari Admin Sidebar** (Untuk Admin KPOTI & Kurator Daerah)

**Lokasi**: Sidebar kiri di Admin Panel

**Menu**: 
- ✅ **"Kalender"** → `/admin/calendar`

**Tampilan**: Menu dengan icon kalender di sidebar admin

**Cara Akses**:
1. Login sebagai Admin KPOTI atau Kurator Daerah
2. Klik menu **"Admin Panel"** atau langsung ke `/admin`
3. Di sidebar kiri, klik menu **"Kalender"**
4. Anda akan masuk ke halaman **Kelola Tanggal Penting**

**Screenshot Menu**:
```
╔════════════════════════════╗
║  □ Dashboard               ║
║  □ Manajemen Pengguna      ║
║  □ Audit Logs              ║
║  □ PROT                    ║
║  □ Daerah                  ║
║  📅 Kalender  ← BARU!     ║
╚════════════════════════════╝
```

---

### 2️⃣ **Dari Navigation Bar** (Semua User)

**Lokasi**: Navbar atas di semua halaman protected

**Menu**:
- ✅ **"Kalender"** → `/calendar` (Public Calendar)

**Cara Akses**:
1. Login ke aplikasi
2. Di navbar atas (sebelah kanan logo), klik **"Kalender"**
3. Anda akan masuk ke **Kalender Publik**

**Screenshot Navbar**:
```
╔════════════════════════════════════════════════╗
║ 🏛️ Nusantara Legacy  [Menu] [Kalender] ← BARU!  ║
╚════════════════════════════════════════════════╝
```

---

### 3️⃣ **Dari Menu Utama** (Dashboard User)

**Lokasi**: `/menu` (Menu Dashboard)

**Card Baru**:
- ✅ **Card "Kalender"** dengan deskripsi dan icon
- ✅ Tombol aksi cepat: **"Jadwal Saya"** dan **"Undangan Kalender"**

**Cara Akses**:
1. Login ke aplikasi
2. Klik **"Menu"** di navbar atau langsung ke `/menu`
3. Scroll ke bagian "Menu Utama"
4. Klik card **"Kalender"** (card dengan icon kalender hijau)
5. Atau gunakan tombol aksi cepat di bawah

**Card Kalender**:
```
╔════════════════════════════════════╗
║  📅 [Image Kalender]               ║
║                                    ║
║  Kalender                          ║
║  Lihat tanggal penting, jadwal,    ║
║  dan event budaya                  ║
║                                    ║
║  [Buka →]                          ║
╚════════════════════════════════════╝
```

**Tombol Aksi Cepat**:
```
╔═══════════════════════════════════════════════╗
║  [📅 Jadwal Saya] [✉️ Undangan Kalender]     ║
╚═══════════════════════════════════════════════╝
```

---

### 4️⃣ **Dari User Dropdown Menu** (Profile Menu)

**Lokasi**: Dropdown user (klik avatar di kanan atas)

**Menu Baru**:
- ✅ **"Jadwal Saya"** → `/calendar/my`
- ✅ **"Undangan Kalender"** → `/calendar/invites`

**Cara Akses**:
1. Login ke aplikasi
2. Klik **avatar/foto profil** di kanan atas navbar
3. Dropdown akan muncul
4. Klik **"Jadwal Saya"** atau **"Undangan Kalender"**

**Dropdown Menu**:
```
╔════════════════════════════════╗
║  John Doe                      ║
║  john@example.com              ║
║ ────────────────────────────── ║
║  □ Admin Panel (jika admin)    ║
║  □ Profil Saya                 ║
║  📅 Jadwal Saya  ← BARU!       ║
║  ✉️ Undangan Kalender ← BARU!  ║
║ ────────────────────────────── ║
║  🚪 Logout                     ║
╚════════════════════════════════╝
```

---

## 🗺️ URL Routes yang Tersedia

### Public Routes (Semua Orang)
```
/calendar
```
**Deskripsi**: Kalender publik dengan tanggal penting dan event

---

### Protected Routes (Authenticated Users)

#### 1. Jadwal Pribadi Saya
```
/calendar/my
```
**Deskripsi**: Kelola jadwal pribadi Anda
**Akses**: Semua user yang login

#### 2. Undangan Kalender
```
/calendar/invites
```
**Deskripsi**: Lihat dan respon undangan kalender
**Akses**: Semua user yang login

---

### Admin Routes (Admin KPOTI & Kurator Daerah)

#### 3. Kelola Tanggal Penting
```
/admin/calendar
```
**Deskripsi**: Kelola tanggal penting dan peringatan budaya
**Akses**: Admin KPOTI, Kurator Daerah

---

## 🎨 Quick Access Links

### Untuk Testing Cepat:

**Akses Kalender Publik**:
```
http://localhost:3000/calendar
```

**Akses Jadwal Pribadi**:
```
http://localhost:3000/calendar/my
```

**Akses Undangan**:
```
http://localhost:3000/calendar/invites
```

**Akses Admin Calendar**:
```
http://localhost:3000/admin/calendar
```

---

## 📋 Checklist Implementasi

✅ Menambahkan menu "Kalender" di Admin Sidebar  
✅ Menambahkan link "Kalender" di Navbar Protected Layout  
✅ Menambahkan card "Kalender" di Menu Dashboard  
✅ Menambahkan "Jadwal Saya" di Aksi Cepat Menu  
✅ Menambahkan "Undangan Kalender" di Aksi Cepat Menu  
✅ Menambahkan "Jadwal Saya" di User Dropdown  
✅ Menambahkan "Undangan Kalender" di User Dropdown  

---

## 🎯 Rekomendasi Penggunaan

### Untuk User Biasa:
1. Klik **"Menu"** → Card **"Kalender"** → Lihat kalender publik
2. Atau klik **"Kalender"** di navbar
3. Untuk jadwal pribadi: Avatar → **"Jadwal Saya"**

### Untuk Admin/Kurator:
1. Masuk ke **Admin Panel**
2. Klik menu **"Kalender"** di sidebar
3. Kelola tanggal penting dari sana

---

## 🚀 Fitur yang Tersedia

### Di Kalender Publik (`/calendar`):
- ✅ View kalender bulanan/mingguan/agenda
- ✅ Filter berdasarkan sumber (tanggal penting/jadwal/event)
- ✅ Search tanggal penting dan event
- ✅ Lihat detail event budaya

### Di Jadwal Saya (`/calendar/my`):
- ✅ Buat jadwal pribadi baru
- ✅ Edit jadwal yang ada
- ✅ Hapus jadwal
- ✅ Atur visibility (private/internal/public)
- ✅ Undang user lain ke jadwal

### Di Undangan (`/calendar/invites`):
- ✅ Lihat semua undangan yang diterima
- ✅ Terima atau tolak undangan
- ✅ Lihat riwayat undangan

### Di Admin Calendar (`/admin/calendar`):
- ✅ Tambah tanggal penting baru
- ✅ Edit tanggal penting
- ✅ Hapus tanggal penting
- ✅ Atur visibility dan warna
- ✅ Set tanggal penting per daerah (untuk kurator)

---

## 💡 Tips Penggunaan

1. **Untuk melihat kalender umum**: Klik "Kalender" di navbar
2. **Untuk kelola jadwal pribadi**: Avatar → "Jadwal Saya"
3. **Untuk lihat undangan**: Avatar → "Undangan Kalender"
4. **Untuk admin/kurator**: Admin Panel → Sidebar "Kalender"

Semua fitur sudah terintegrasi dan siap digunakan! 🎉
