# Nusantara Play — Dokumentasi Halaman Frontend

Dokumen ini berisi daftar semua halaman di frontend Nusantara Play, beserta fungsi dan data yang ditampilkan.
Digunakan sebagai referensi untuk kebutuhan refactor tampilan (UI).

---

## Daftar Isi

1. [Public / Landing](#1-public--landing)
2. [Auth](#2-auth)
3. [Menu Utama](#3-menu-utama)
4. [Profil & Akun](#4-profil--akun)
5. [PROT — Permainan Rakyat & Olahraga Tradisional](#5-prot--permainan-rakyat--olahraga-tradisional)
6. [Events](#6-events)
7. [Kalender](#7-kalender)
8. [Marketplace](#8-marketplace)
9. [Admin Panel](#9-admin-panel)
10. [Utility](#10-utility)

---

## 1. Public / Landing

### `/ ` — Halaman Utama (Landing Page)
**Akses:** Publik (tidak perlu login)

**Fungsi:** Halaman pemasaran / pengenalan platform. Berisi ajakan untuk mendaftar atau masuk.

**Konten yang ditampilkan:**
- **Header/Navbar:** Logo, navigasi (Tentang, Jelajahi PROT, Komunitas), tombol Masuk/Daftar (jika belum login) atau tombol Main Menu (jika sudah login), toggle tema gelap/terang
- **Hero Section:** Judul besar, tagline, dua CTA button (Mulai Sekarang / Main Menu, Jelajahi PROT)
- **Stats Bar:** 4 angka statistik statis — "500+ Permainan Terdokumentasi", "34 Provinsi Terwakili", "120+ Komunitas Aktif", "5.000+ Anggota Terdaftar"
- **Features Grid (3 kartu):** Arsip Terverifikasi, Komunitas & Event, Sertifikasi Budaya
- **Blockchain Section:** Penjelasan integrasi Polygon — 4 kartu fitur (Immutability, Keaslian Data, Transparansi, Warisan Masa Depan)
- **Cara Kerja:** 3 langkah (Daftar Akun, Jelajahi & Pelajari, Berkontribusi) dengan nomor besar
- **Featured Games:** 4 kartu permainan statis (Congklak, Egrang, Gobak Sodor, Petak Umpet) + tombol "Lihat Semua Permainan"
- **CTA Banner:** Background primary, ajakan bergabung, tombol Daftar Gratis / Ke Main Menu
- **Footer:** Branding + deskripsi, navigasi (Jelajahi PROT, Kalender Event, Daftar, Masuk), Legal (Kebijakan Privasi, Syarat & Ketentuan), copyright

---

## 2. Auth

### `/login` — Halaman Login
**Akses:** Publik (guest only, redirect ke menu jika sudah login)

**Fungsi:** Autentikasi pengguna via Supabase.

**Konten yang ditampilkan:**
- Judul "Sign In"
- Komponen `LoginForm` — form email & password, tombol submit, link ke signup

---

### `/signup` — Halaman Daftar Akun
**Akses:** Publik (guest only)

**Fungsi:** Registrasi akun baru.

**Konten yang ditampilkan:**
- Judul "Create Account"
- Komponen `SignupForm` — form nama, email, password, tombol submit, link ke login

---

## 3. Menu Utama

### `/menu` — Main Menu / Dashboard
**Akses:** Login required

**Fungsi:** Hub navigasi utama. Titik masuk ke semua modul aplikasi setelah login.

**Konten yang ditampilkan:**
- Header: sapaan "Selamat Datang, [Nama]!"
- **Grid kartu menu (5 kartu):**
  - Permainan & Olahraga Tradisional → `/prot`
  - Events → `/events`
  - Marketplace → `/marketplace`
  - Sertifikat Prestasi → `/sertifikat`
  - Kalender → `/calendar`
- Setiap kartu memiliki: gambar thumbnail, judul, deskripsi singkat, teks "Buka" dengan panah

---

## 4. Profil & Akun

### `/profile` — Profil Saya
**Akses:** Login required

**Fungsi:** Melihat dan mengedit data profil pengguna.

**Konten yang ditampilkan (mode lihat):**
- Komponen `UserProfileCard` — foto profil, nama lengkap, email, role, status akun, tombol "Edit Profil"

**Konten yang ditampilkan (mode edit):**
- Komponen `EditProfileForm` — form nama lengkap, nomor telepon, tombol Simpan / Batal

---

### `/change-password` — Ubah Password
**Akses:** Login required

**Fungsi:** Mengubah password akun pengguna.

**Konten yang ditampilkan:**
- Tombol kembali
- Judul "Ubah Password"
- Komponen `ChangePasswordForm` — form password baru + konfirmasi, tombol Simpan / Batal
- Kotak info biru — 4 tips keamanan password

---

### `/sertifikat` — Sertifikat Prestasi
**Akses:** Login required

**Fungsi:** Halaman sertifikat (placeholder, belum diimplementasi)

**Konten yang ditampilkan:**
- Teks "Hello World - Sertifikat" (placeholder)

---

## 5. PROT — Permainan Rakyat & Olahraga Tradisional

### `/prot` — Daftar PROT
**Akses:** Login required

**Fungsi:** Browse dan cari seluruh data PROT yang tersedia. Titik masuk utama untuk modul PROT.

**Konten yang ditampilkan:**
- Breadcrumb: Beranda > Daftar PROT
- Judul "Daftar Permainan Rakyat & Olahraga Tradisional"
- Toggle tampilan: Grid / List
- Tombol "Tambah Data Baru" → `/prot/create`
- Tombol toggle filter
- **Panel filter (collapsible)** via komponen `ProtFilter`:
  - Pencarian teks (nama)
  - Filter jenis (Permainan Rakyat / Olahraga Tradisional)
  - Filter status (DRAFT, DIKURASI, REVISI, DIVERIFIKASI, ARSIP_NASIONAL)
  - Filter provinsi, kabupaten
  - Filter target usia
  - Tombol Reset
- **Grid view:** Kartu PROT via komponen `ProtCard` (gambar, nama, jenis badge, status badge, daerah)
- **List view:** Baris per PROT — nama, badge jenis, badge status, lokasi (kabkota + provinsi), target usia, panah kanan
- **Pagination:** Tampilkan X-Y dari N data, tombol Sebelumnya/Berikutnya, dropdown per halaman (12/24/48)

---

### `/prot/create` — Tambah PROT Baru
**Akses:** Login required (kurator_daerah, admin_kpoti)

**Fungsi:** Form input data PROT baru.

**Konten yang ditampilkan:**
- Breadcrumb: Beranda > Daftar PROT > Tambah Baru
- Judul "Tambah Permainan & Olahraga Tradisional"
- Komponen `ProtForm` — form lengkap:
  - Nama PROT
  - Jenis (Permainan Rakyat / Olahraga Tradisional)
  - Target Usia
  - Status Asal Usul
  - Lokasi: Provinsi, Kabupaten/Kota, Kecamatan, Desa, Alamat Lengkap
  - Cara Bermain (textarea)
  - Nilai Moral (textarea)
  - Peralatan (dynamic list: nama, deskripsi, kisaran harga, url pembelian, upload foto alat)
  - Upload foto kegiatan (multiple)
  - Upload video kegiatan (multiple)
  - Upload dokumen kurikulum (multiple)
  - Tombol Simpan

---

### `/prot/[id]` — Detail PROT
**Akses:** Login required

**Fungsi:** Melihat detail lengkap satu PROT. Aksi berbeda tersedia tergantung status dan role.

**Konten yang ditampilkan:**
- **Header area (muted background):**
  - Breadcrumb: Beranda > Daftar PROT > [Nama PROT]
  - Nama PROT (judul besar)
  - Badge jenis (Permainan Rakyat / Olahraga Tradisional)
  - Badge status (DRAFT, DIKURASI, REVISI, DIVERIFIKASI, ARSIP_NASIONAL)
  - Komponen `BlockchainBadge` (jika status DIVERIFIKASI atau ARSIP_NASIONAL)
  - Lokasi (kabkota + provinsi)
  - Tombol aksi (kondisional berdasarkan role & status):
    - History — selalu tampil
    - Edit — jika status DRAFT atau REVISI
    - Ajukan Verifikasi — jika status DRAFT atau REVISI
    - Publish — jika status DIVERIFIKASI dan user adalah admin_kpoti
    - Hapus — jika user adalah admin_kpoti

- **Kolom kiri (1/3 lebar):**
  - Galeri foto kegiatan (1 foto utama + thumbnail strip scroll horizontal)
  - Kartu "Informasi Dasar": Target Usia, Status Asal Usul, Lokasi lengkap, Alamat Lengkap
  - Video kegiatan (jika ada, player video HTML5)

- **Kolom kanan (2/3 lebar):**
  - Kartu "Cara Bermain" (konten teks)
  - Kartu "Nilai Moral / Budaya" (konten teks)
  - Kartu "Peralatan yang Dibutuhkan" (grid: foto alat + nama + deskripsi + kisaran harga + link beli)
  - Kartu "Dokumen Kurikulum / Panduan" (list file downloadable)
  - Komponen `BlockchainProofCard` (jika status DIVERIFIKASI atau ARSIP_NASIONAL) — hash, tx hash, block number, status integritas
  - Footer metadata: tanggal dibuat, tanggal update, ID

---

### `/prot/[id]/edit` — Edit PROT
**Akses:** Login required, hanya bisa jika status DRAFT atau REVISI

**Fungsi:** Edit data PROT yang sudah ada. Mendukung add/remove foto, video, dokumen, foto alat.

**Konten yang ditampilkan:**
- Breadcrumb: Beranda > Daftar PROT > [Nama] > Edit
- Judul "Edit Data: [Nama PROT]"
- Komponen `ProtForm` dengan data awal terisi — field sama dengan halaman Create
- Jika status bukan DRAFT/REVISI: tampilkan pesan "Akses Ditolak" dengan info status saat ini

---

### `/prot/[id]/history` — Riwayat Verifikasi PROT
**Akses:** Login required

**Fungsi:** Melihat seluruh riwayat proses verifikasi/review suatu PROT.

**Konten yang ditampilkan:**
- Breadcrumb + tombol kembali ke detail
- Judul "Riwayat Verifikasi"
- **Timeline vertikal** — setiap entri berisi:
  - Icon status (centang hijau / silang merah / seru kuning / jam abu)
  - Badge status (APPROVED / REJECTED / REVISION_NEEDED / PENDING)
  - Tanggal & waktu review
  - Nama reviewer (pakar)
  - Catatan reviewer
  - Saran perbaikan (jika status REVISION_NEEDED, background kuning)
  - Dokumen pendukung (link download)
- Empty state jika belum pernah direview

---

### `/prot/verifikasi/queue` — Antrean Verifikasi Tersedia
**Akses:** Login required (pakar, admin_kpoti)

**Fungsi:** Daftar PROT yang menunggu diverifikasi dan bisa diambil oleh pakar.

**Konten yang ditampilkan:**
- Judul "Antrean Verifikasi Tersedia"
- Tombol Refresh
- Komponen `VerificationTable` (type: available):
  - Tabel/list entri antrean: nama PROT, daerah, tanggal submit, tombol "Ambil Tugas"
- Pagination (Prev / halaman / Next)

---

### `/prot/verifikasi/my-queue` — Tugas Verifikasi Saya
**Akses:** Login required (pakar, admin_kpoti)

**Fungsi:** Daftar PROT yang sudah diambil oleh pakar dan menunggu direview.

**Konten yang ditampilkan:**
- Judul "Tugas Verifikasi Saya"
- Tombol Refresh
- Komponen `VerificationTable` (type: assigned):
  - Tabel/list tugas: nama PROT, daerah, tanggal ambil, tombol "Review" → `/prot/verifikasi/[id]/review`, tombol "Lepas Tugas"

---

### `/prot/verifikasi/[id]/review` — Form Review PROT
**Akses:** Login required (pakar)

**Fungsi:** Interface untuk pakar melakukan review terhadap satu PROT.

**Konten yang ditampilkan:**
- Navbar: tombol kembali, nama PROT
- **Kolom kiri (2/3) — Preview Konten PROT:**
  - Grid info dasar: Jenis, Target Usia, Lokasi, Pembuat
  - Cara Bermain (scrollable box)
  - Nilai Moral (scrollable box)
  - Link "Lihat Detail Lengkap di Tab Baru"
- **Kolom kanan (1/3, sticky) — Form Verifikasi:**
  - Radio keputusan: Setujui (hijau) / Perlu Revisi (kuning) / Tolak (merah)
  - Textarea catatan reviewer
  - Textarea saran perbaikan (muncul hanya jika pilih "Perlu Revisi", wajib diisi)
  - Tombol "Kirim Hasil Review" (warna sesuai keputusan)

---

## 6. Events

### `/events` — Daftar Events
**Akses:** Login required

**Fungsi:** Browse semua event budaya yang tersedia. Titik masuk utama modul events.

**Konten yang ditampilkan:**
- Judul "Events Budaya", subjudul
- Tombol "Event Terdaftar" → `/events/my-registrations` (semua user)
- Tombol "Event Saya" → `/events/my-events` (kurator/admin)
- Tombol "Buat Event Baru" → `/events/create` (kurator/admin)
- Komponen `EventFilter`: search, filter jenis, filter status
- **Grid 3 kolom kartu event** via komponen `EventCard`:
  - Banner/gambar event
  - Nama event
  - Badge jenis (Kompetisi, Festival, Workshop, dll)
  - Badge status
  - Tanggal, lokasi, jumlah peserta
- Pagination (Previous / halaman X dari N / Next)

---

### `/events/create` — Buat Event Baru
**Akses:** Login required (kurator_daerah, admin_kpoti)

**Fungsi:** Form input event baru.

**Konten yang ditampilkan:**
- Tombol kembali
- Judul "Buat Event Baru"
- Komponen `EventForm`:
  - Nama event
  - Jenis event (dropdown)
  - Tanggal mulai & selesai (datetime picker)
  - Lokasi (teks)
  - Daerah (dropdown kabupaten/kota)
  - Kuota peserta (opsional)
  - Deskripsi (textarea)
  - Persyaratan peserta (textarea, opsional)
  - Kontak: nama, telepon, email
  - Banner URL (opsional)
  - Tombol Buat Event / Batal

---

### `/events/[id]` — Detail Event
**Akses:** Login required

**Fungsi:** Halaman detail satu event dengan aksi pendaftaran atau pengelolaan.

**Konten yang ditampilkan:**
- Tombol kembali
- **Banner event** (gambar full-width atau placeholder gradien dengan inisial nama)
- **Kolom utama (2/3):**
  - Nama event (judul besar)
  - Badge jenis + badge status
  - Deskripsi lengkap
  - Persyaratan peserta (jika ada)
  - **Panel "Kelola Event"** (hanya pemilik event):
    - Tombol Publikasikan (jika DRAFT)
    - Tombol Edit Event (jika DRAFT) → `/events/[id]/edit`
    - Tombol Kelola Peserta → `/events/[id]/registrations`
    - Tombol Batalkan Event (jika PUBLISHED/ONGOING)
    - Tombol Hapus Event
- **Sidebar (1/3):**
  - Kartu "Detail Event": tanggal mulai, tanggal selesai, lokasi, daerah, kuota peserta (X/Y, badge "Penuh" jika habis)
  - Kartu "Kontak": nama, telepon, email kontak person
  - Kartu tombol "Daftar Event" / "Telah Mendaftarkan Event" (untuk user bukan pemilik, status PUBLISHED)
  - Kartu "Penyelenggara": nama penyelenggara

---

### `/events/[id]/edit` — Edit Event
**Akses:** Login required (pemilik event), hanya jika status DRAFT

**Fungsi:** Edit detail event yang belum dipublikasikan.

**Konten yang ditampilkan:**
- Tombol kembali
- Judul "Edit Event"
- Komponen `EventForm` dengan data awal terisi — field sama dengan Create Event
- Jika status bukan DRAFT: pesan "Hanya event draft yang dapat diedit"

---

### `/events/[id]/registrations` — Kelola Peserta Event
**Akses:** Login required (pemilik event)

**Fungsi:** Melihat dan mengelola daftar peserta yang terdaftar di event ini.

**Konten yang ditampilkan:**
- Tombol kembali ke detail event
- Judul "Kelola Peserta" + nama event
- Komponen `EventRegistrationTable`:
  - Tabel peserta: nama, email, status (registered/checked_in/cancelled), tanggal daftar, tanggal check-in
  - Tombol "Check In" / "Batal Check In" per peserta

---

### `/events/my-events` — Event Saya
**Akses:** Login required (kurator_daerah, admin_kpoti)

**Fungsi:** Melihat semua event yang dibuat oleh user yang login.

**Konten yang ditampilkan:**
- Tombol kembali
- Judul "Event Saya"
- Tombol "Buat Event Baru"
- Komponen `EventFilter` (dengan filter status)
- Grid kartu event via `EventCard` (dengan badge status tampil)
- Pagination
- Empty state dengan tombol "Buat Event Pertama"

---

### `/events/my-registrations` — Event yang Saya Daftar
**Akses:** Login required

**Fungsi:** Daftar event yang pernah/sedang didaftarkan oleh user.

**Konten yang ditampilkan:**
- Tombol kembali ke Semua Event
- Judul "Event yang Saya Daftar"
- Grid kartu — setiap item:
  - Badge status registrasi (Terdaftar biru / Sudah Check-in hijau / Dibatalkan merah) di pojok kanan atas
  - Kartu event via `EventCard`
  - Panel bawah (border): tanggal daftar, tanggal check-in (jika ada)
- Empty state dengan tombol "Lihat Semua Event"

---

## 7. Kalender

### `/calendar` — Kalender Nusantara Play
**Akses:** Tidak perlu login (accessible dari footer)

**Fungsi:** Kalender publik berisi tanggal penting budaya dan event komunitas.

**Konten yang ditampilkan:**
- Judul "Kalender Nusantara Play"
- Toggle tampilan: Kalender (grid) / Agenda (list)
- **Mode Kalender:** Komponen `CalendarViewComponent` — grid kalender bulanan dengan event/tanggal penting ditandai
- **Mode Agenda:** Komponen `CalendarAgenda` — daftar upcoming event dalam format list
- **Modal Detail Item** (klik item): komponen `CalendarItemDetail` — judul, tanggal, deskripsi, tipe

---

### `/calendar/my` — Jadwal Pribadi Saya
**Akses:** Login required

**Fungsi:** Manajemen jadwal pribadi pengguna (CRUD).

**Konten yang ditampilkan:**
- Judul "Jadwal Pribadi Saya"
- Tombol "Buat Jadwal Baru"
- **List jadwal** — setiap item:
  - Bar warna kiri (sesuai warna jadwal)
  - Judul jadwal
  - Badge visibility (public/internal/private)
  - Deskripsi singkat
  - Tanggal mulai & selesai (beserta jam jika bukan all-day)
  - Tombol: Detail, Edit, Hapus
- Empty state jika belum ada jadwal
- **Modal form** (create/edit): komponen `CalendarItemForm` — judul, deskripsi, tanggal mulai/selesai, all-day toggle, warna, visibility
- **Modal detail**: komponen `CalendarItemDetail`

---

### `/calendar/invites` — Undangan Kalender
**Akses:** Login required

**Fungsi:** Melihat dan merespons undangan jadwal dari pengguna lain.

**Konten yang ditampilkan:**
- Judul "Undangan Kalender"
- Komponen `CalendarInvites` — list undangan masuk: judul acara, pengirim, tanggal, tombol Terima / Tolak

---

## 8. Marketplace

### `/marketplace` — Browse Marketplace
**Akses:** Login required

**Fungsi:** Halaman utama marketplace — browse produk peralatan permainan tradisional.

**Konten yang ditampilkan:**
- Judul "Marketplace", subjudul
- Tombol "Pesanan Saya" → `/marketplace/orders`
- Tombol "Toko Saya" → `/marketplace/toko-saya`
- Komponen `ProdukFilter`: search nama produk, filter kategori, filter toko, filter harga
- **Grid 4 kolom kartu produk** via komponen `ProdukCard`:
  - Gambar produk (atau placeholder gradien)
  - Badge kategori
  - Nama produk
  - Harga (format Rupiah)
  - Nama toko
  - Stok indicator
- Empty state jika tidak ada produk

---

### `/marketplace/toko-saya` — Dashboard Toko Saya
**Akses:** Login required

**Fungsi:** Halaman manajemen toko milik user (seller dashboard).

**Konten jika belum punya toko:**
- Ikon toko besar
- Pesan "Anda belum memiliki toko"
- Tombol "Daftar Sebagai Penjual" → `/marketplace/toko-saya/create`

**Konten jika sudah punya toko:**
- **Header toko:** nama toko, deskripsi toko
- Tombol "Pesanan Masuk" → `/marketplace/seller-orders` + badge merah jumlah pesanan menunggu
- **Daftar produk milik toko** via `ProdukCard`
- Tombol "Tambah Produk" → `/marketplace/toko-saya/produk/create`
- Empty state jika belum ada produk

---

### `/marketplace/toko-saya/create` — Daftar Sebagai Penjual
**Akses:** Login required

**Fungsi:** Form registrasi toko baru.

**Konten yang ditampilkan:**
- Tombol kembali
- Judul "Daftar Sebagai Penjual"
- Komponen `TokoForm`:
  - Nama toko
  - Deskripsi
  - Alamat
  - Nomor WhatsApp
  - Logo URL (opsional)
  - Tombol Simpan / Batal

---

### `/marketplace/toko-saya/produk/create` — Tambah Produk Baru
**Akses:** Login required (harus punya toko)

**Fungsi:** Form input produk baru ke dalam toko.

**Konten yang ditampilkan:**
- Tombol kembali ke Toko Saya
- Judul "Tambah Produk Baru"
- Komponen `ProdukForm`:
  - Nama produk
  - Harga (Rupiah)
  - Stok
  - Deskripsi (textarea)
  - Kategori (dropdown dari API)
  - Gambar produk (URLs, multiple)
  - Tautan PROT terkait (opsional, multi-select)
  - Tombol Simpan / Batal

---

### `/marketplace/toko-saya/produk/[id]/edit` — Edit Produk
**Akses:** Login required (pemilik produk)

**Fungsi:** Edit data produk yang sudah ada.

**Konten yang ditampilkan:**
- Tombol kembali ke Toko Saya
- Judul "Edit Produk: [Nama Produk]"
- Komponen `ProdukForm` dengan data awal terisi — field sama dengan Create Produk

---

### `/marketplace/toko/[id]` — Detail Toko
**Akses:** Login required

**Fungsi:** Halaman profil publik toko milik seller.

**Konten yang ditampilkan:**
- Tombol kembali ke Marketplace
- **Header toko:** logo toko (atau ikon placeholder), nama toko, deskripsi, alamat
- Tombol "Hubungi via WhatsApp" (jika ada nomor WhatsApp)
- Judul "Produk (N)"
- Grid produk toko via `ProdukCard`

---

### `/marketplace/produk/[id]` — Detail Produk
**Akses:** Login required

**Fungsi:** Halaman detail satu produk dengan opsi pembelian.

**Konten yang ditampilkan:**
- Tombol kembali ke Marketplace
- **Kolom kiri (foto):**
  - Foto utama produk (atau placeholder gradien)
  - Thumbnail foto tambahan (grid 4 kolom)
- **Kolom kanan (info):**
  - Badge kategori
  - Nama produk
  - Harga (format Rupiah, besar)
  - Status stok (jumlah tersisa atau "Stok Habis" merah)
  - Deskripsi produk
  - **PROT terkait:** chips/tag nama PROT (link ke `/prot/[id]`)
  - **Info toko:** logo + nama + alamat (link ke halaman toko)
  - Tombol "Beli Sekarang" (muncul jika bukan pemilik dan stok > 0)
  - Tombol "Edit Produk" (muncul jika pemilik)
- **Modal Checkout** (saat klik Beli): komponen `CheckoutForm` — nama penerima, telepon, alamat, kota, provinsi, kode pos, catatan, tombol pesan

---

### `/marketplace/orders` — Pesanan Saya (Buyer)
**Akses:** Login required

**Fungsi:** Daftar semua order yang pernah dibuat oleh user sebagai pembeli.

**Konten yang ditampilkan:**
- Tombol kembali ke Marketplace
- Judul "Pesanan Saya"
- **List kartu pesanan** — setiap item (link ke detail):
  - Tanggal pesanan
  - Badge status pesanan (menunggu/dikonfirmasi/dikirim/selesai/dibatalkan)
  - Nama toko
  - Jumlah item
  - Total harga (Rupiah, hijau)
- Empty state jika belum ada pesanan

---

### `/marketplace/orders/[id]` — Detail Pesanan
**Akses:** Login required (pembeli atau penjual pesanan tersebut)

**Fungsi:** Detail satu transaksi, dengan aksi yang berbeda untuk pembeli dan penjual.

**Konten yang ditampilkan:**
- Tombol kembali (ke Pesanan Saya atau Pesanan Masuk tergantung role)
- **Header:** "Detail Pesanan", tanggal, badge status
- **Tabel item pesanan:** nama produk, harga satuan × qty, subtotal; baris total (hijau)
- **Alamat pengiriman:** nama penerima, telepon, alamat lengkap, kota, provinsi, kode pos
- **Info pengiriman** (jika sudah dikirim): nama kurir, nomor resi
- **Catatan** (jika ada)
- **Info penjual/pembeli:**
  - Jika pembeli: nama toko (link)
  - Jika penjual: nama pembeli + email
- **Form kirim pesanan** (expandable, untuk penjual): input kurir + nomor resi
- **Tombol aksi (kondisional):**
  - Penjual: Konfirmasi Pesanan (jika MENUNGGU)
  - Penjual: Kirim Pesanan (jika DIKONFIRMASI)
  - Pembeli: Pesanan Diterima / Selesaikan (jika DIKIRIM)
  - Pembeli & Penjual: Batalkan Pesanan (jika MENUNGGU; penjual juga bisa di DIKONFIRMASI)

---

### `/marketplace/seller-orders` — Pesanan Masuk (Seller)
**Akses:** Login required (pemilik toko)

**Fungsi:** Daftar semua order masuk ke toko milik user.

**Konten yang ditampilkan:**
- Tombol kembali ke Toko Saya
- Judul "Pesanan Masuk"
- **List kartu pesanan** — setiap item (link ke detail):
  - Tanggal pesanan
  - Badge status
  - Nama pembeli
  - Jumlah item
  - Total harga

---

## 9. Admin Panel

> Semua halaman admin memerlukan role `admin_kpoti`. Akses tanpa role ini akan redirect ke `/unauthorized`.

### `/admin/dashboard` — Admin Dashboard
**Akses:** admin_kpoti

**Fungsi:** Overview statistik sistem.

**Konten yang ditampilkan:**
- Header: "Dashboard", subjudul
- **Statistik Pengguna:** kartu "Total Pengguna" (angka)
- **Statistik Daerah:** 4 kartu — Total Daerah, Provinsi, Kabupaten, Kota (angka)
- **Aksi Cepat:** 3 kartu link — Kelola Pengguna (`/admin/users`), Lihat Audit Log (`/admin/audit`), Kelola Daerah (`/admin/daerah`)

---

### `/admin/users` — Manajemen User
**Akses:** admin_kpoti

**Fungsi:** Lihat, filter, ubah role, dan ubah status semua pengguna sistem.

**Konten yang ditampilkan:**
- Header "Manajemen User"
- Kartu statistik: Total User (angka)
- **Panel filter:**
  - Dropdown Role (Publik / Pakar / Kurator Daerah / Admin KPOTI)
  - Dropdown Status (Aktif / Tidak Aktif / Ditangguhkan)
  - Tombol Terapkan Filter / Reset
- Komponen `UsersTable` — tabel pengguna:
  - Nama, email, role (dropdown ubah langsung), status (dropdown ubah langsung), tanggal daftar, tombol Detail
- Komponen `Pagination`

---

### `/admin/audit` — Audit Logs
**Akses:** admin_kpoti

**Fungsi:** Monitor semua aktivitas yang terjadi di sistem.

**Konten yang ditampilkan:**
- Header "Audit Logs"
- Komponen `AuditLogFilters`: filter user, filter entity type, filter entity ID, filter aksi, filter tanggal range
- Komponen `AuditLogTable` — tabel:
  - Timestamp, user (nama + ID), aksi (CREATE/UPDATE/DELETE/dll), entity type, entity ID, deskripsi perubahan
- Komponen `Pagination`

---

### `/admin/audit/user/[id]` — Audit Log per User
**Akses:** admin_kpoti

**Fungsi:** Melihat riwayat aktivitas satu pengguna spesifik.

**Konten yang ditampilkan:**
- Tombol kembali
- Judul "Audit Log - Aktivitas User"
- Info "Riwayat aktivitas untuk user ID: [UUID]"
- Komponen `AuditLogTable` — tabel aktivitas user tersebut
- Komponen `Pagination`

---

### `/admin/prot` — Manajemen PROT (Stats)
**Akses:** admin_kpoti

**Fungsi:** Overview statistik dan aksi cepat untuk modul PROT.

**Konten yang ditampilkan:**
- Judul "Manajemen PROT"
- **4 kartu statistik:** Menunggu Review (pending queue), Disetujui, Perlu Revisi, Arsip Nasional
- **2 kartu breakdown:**
  - PROT by Status — list setiap status dan jumlahnya
  - Summary Verifikasi — Total Review, Approved, Rejected, Revision
- **Panel Aksi Cepat:** link ke Lihat Queue, Tugas Saya, Lihat Semua PROT, tombol Refresh stats

---

### `/admin/prot/all` — Kelola Semua PROT
**Akses:** admin_kpoti

**Fungsi:** Tabel semua PROT dengan filter lengkap, dapat melihat detail setiap PROT.

**Konten yang ditampilkan:**
- Judul "Kelola PROT"
- **Panel filter:**
  - Input pencarian nama
  - Dropdown Status
  - Dropdown Jenis
  - Tombol Reset Filter
- Info total: "Total: N PROT" + "Halaman X dari Y"
- **Tabel PROT:**
  - Kolom: Nama, Jenis (badge), Status (badge berwarna), Daerah (kabkota + provinsi), Tanggal dibuat, Aksi (link "Detail")
- Pagination

---

### `/admin/prot/publish` — Publish ke Arsip Nasional
**Akses:** admin_kpoti

**Fungsi:** Daftar PROT yang sudah diverifikasi (status DIVERIFIKASI) dan siap dipublish ke Arsip Nasional.

**Konten yang ditampilkan:**
- Judul "Publish ke Arsip Nasional"
- **List kartu PROT (status DIVERIFIKASI)** — setiap kartu:
  - Nama PROT
  - Badge status (hijau "DIVERIFIKASI")
  - Badge jenis
  - Lokasi (kabkota + provinsi)
  - Tanggal diverifikasi
  - Status asal usul (preview teks)
  - Tombol "Lihat Detail" → `/prot/[id]`
  - Tombol "Publish" (ungu) — konfirmasi, lalu publish
- Empty state jika tidak ada yang siap publish

---

### `/admin/daerah` — Data Daerah
**Akses:** admin_kpoti

**Fungsi:** Lihat dan filter data wilayah Indonesia (provinsi, kabupaten, kota).

**Konten yang ditampilkan:**
- Header "Data Daerah"
- **4 kartu statistik:** Total Daerah, Provinsi, Kabupaten, Kota
- **Panel filter:**
  - Dropdown Level (Provinsi / Kabupaten / Kota)
  - Input nama provinsi
  - Tombol Terapkan Filter / Reset
- **Tabel daerah:**
  - Kolom: Nama, Kode, Level (badge berwarna), Provinsi, Koordinat (lat/long)
- Komponen `Pagination`

---

### `/admin/calendar` — Manajemen Tanggal Penting
**Akses:** admin_kpoti

**Fungsi:** CRUD tanggal penting dan peringatan budaya yang tampil di kalender publik.

**Konten yang ditampilkan:**
- Judul "Tanggal Penting"
- Tombol "Tambah Tanggal Penting"
- **3 kartu statistik:** Total, Public, Internal
- **Tabel tanggal penting:**
  - Kolom: Judul (dengan dot warna + deskripsi preview), Tanggal (mulai → selesai), Visibilitas (badge), Daerah (Nasional atau Daerah), Aksi (Detail, Edit, Hapus)
- Empty state dengan tombol tambah
- **Modal form** (create/edit): komponen `CalendarItemForm` untuk tanggal penting — judul, deskripsi, tanggal mulai/selesai, warna, visibility, daerah (opsional)
- **Modal detail**: komponen `CalendarItemDetail`

---

### `/admin/marketplace/kategori` — Kategori Produk
**Akses:** admin_kpoti

**Fungsi:** CRUD kategori produk marketplace.

**Konten yang ditampilkan:**
- Judul "Kategori Produk"
- Tombol "Tambah Kategori"
- **Form inline** (create/edit, collapsible):
  - Input nama kategori (auto-generate slug)
  - Input slug (manual edit)
  - Textarea deskripsi
  - Tombol Simpan / Batal
- **Tabel kategori:**
  - Kolom: Nama, Slug, Deskripsi, Aksi (Edit ikon pensil, Hapus ikon trash)

---

## 10. Utility

### `/unauthorized` — Halaman Akses Ditolak (403)
**Akses:** Publik

**Fungsi:** Ditampilkan ketika user mencoba mengakses halaman yang tidak diizinkan.

**Konten yang ditampilkan:**
- Ikon segitiga peringatan merah besar
- Judul "Akses Ditolak"
- Pesan "Anda tidak memiliki izin untuk mengakses halaman ini"
- Kode error "403"
- Tombol "Kembali ke Dashboard" → `/menu`
- Tombol "Lihat Profil Saya" → `/profile`
- Teks bantuan untuk hubungi administrator

---

## Ringkasan Halaman

| No | URL | Akses | Modul |
|----|-----|-------|-------|
| 1 | `/` | Publik | Landing |
| 2 | `/login` | Publik | Auth |
| 3 | `/signup` | Publik | Auth |
| 4 | `/unauthorized` | Publik | Utility |
| 5 | `/menu` | Login | Navigasi |
| 6 | `/profile` | Login | Akun |
| 7 | `/change-password` | Login | Akun |
| 8 | `/sertifikat` | Login | Sertifikat |
| 9 | `/prot` | Login | PROT |
| 10 | `/prot/create` | Login (Kurator/Admin) | PROT |
| 11 | `/prot/[id]` | Login | PROT |
| 12 | `/prot/[id]/edit` | Login | PROT |
| 13 | `/prot/[id]/history` | Login | PROT |
| 14 | `/prot/verifikasi/queue` | Login (Pakar/Admin) | PROT |
| 15 | `/prot/verifikasi/my-queue` | Login (Pakar/Admin) | PROT |
| 16 | `/prot/verifikasi/[id]/review` | Login (Pakar) | PROT |
| 17 | `/events` | Login | Events |
| 18 | `/events/create` | Login (Kurator/Admin) | Events |
| 19 | `/events/[id]` | Login | Events |
| 20 | `/events/[id]/edit` | Login (Owner) | Events |
| 21 | `/events/[id]/registrations` | Login (Owner) | Events |
| 22 | `/events/my-events` | Login (Kurator/Admin) | Events |
| 23 | `/events/my-registrations` | Login | Events |
| 24 | `/calendar` | Publik | Kalender |
| 25 | `/calendar/my` | Login | Kalender |
| 26 | `/calendar/invites` | Login | Kalender |
| 27 | `/marketplace` | Login | Marketplace |
| 28 | `/marketplace/toko-saya` | Login | Marketplace |
| 29 | `/marketplace/toko-saya/create` | Login | Marketplace |
| 30 | `/marketplace/toko-saya/produk/create` | Login (Seller) | Marketplace |
| 31 | `/marketplace/toko-saya/produk/[id]/edit` | Login (Seller) | Marketplace |
| 32 | `/marketplace/toko/[id]` | Login | Marketplace |
| 33 | `/marketplace/produk/[id]` | Login | Marketplace |
| 34 | `/marketplace/orders` | Login | Marketplace |
| 35 | `/marketplace/orders/[id]` | Login | Marketplace |
| 36 | `/marketplace/seller-orders` | Login (Seller) | Marketplace |
| 37 | `/admin/dashboard` | Admin | Admin |
| 38 | `/admin/users` | Admin | Admin |
| 39 | `/admin/audit` | Admin | Admin |
| 40 | `/admin/audit/user/[id]` | Admin | Admin |
| 41 | `/admin/prot` | Admin | Admin |
| 42 | `/admin/prot/all` | Admin | Admin |
| 43 | `/admin/prot/publish` | Admin | Admin |
| 44 | `/admin/daerah` | Admin | Admin |
| 45 | `/admin/calendar` | Admin | Admin |
| 46 | `/admin/marketplace/kategori` | Admin | Admin |


