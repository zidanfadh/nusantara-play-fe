# Landing Page Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `app/page.tsx` menjadi landing page yang lebih lengkap dan menarik dengan konten statis berkualitas tinggi, tanpa mengorbankan performa dan SEO.

**Architecture:** Semua konten statis (hardcoded), pure server component, zero client-side JS baru. Semua section ditulis inline di `app/page.tsx` — tidak perlu komponen baru karena YAGNI. Warna menggunakan CSS variables yang sudah ada di `globals.css`.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, CSS variables (`--color-primary`, `--color-secondary`, `--color-accent`, dll), inline SVG icons.

---

## Context & Constraints

- **File utama:** `app/page.tsx` — server component, sudah fetch user dari Supabase
- **Warna (jangan diubah):** primary `#C04A21`, secondary `#1A5F7A`, accent `#D4A017`, background `#F7F3E8`
- **CSS classes:** gunakan Tailwind utility classes yang merujuk ke CSS variables (`bg-primary`, `text-secondary`, `bg-accent`, dll)
- **Performa:** tidak boleh ada `'use client'`, tidak boleh ada fetch tambahan di landing page
- **Navbar logged-in:** ganti teks "Menu Saya" → "Main Menu" (berlaku di dua tempat: header dan hero CTA)

---

## Sections yang akan dibangun

1. Header (modifikasi: ganti "Menu Saya" → "Main Menu")
2. Hero (modifikasi: tambah badge + perkuat visual)
3. Stats Bar (baru: 4 angka statis)
4. Features Grid (modifikasi: perkuat konten kartu)
5. How It Works (baru: 3 langkah)
6. Featured Games (baru: 4 kartu permainan hardcoded)
7. CTA Banner (baru: ajakan bergabung)
8. Footer (modifikasi: perluas kolom)

---

## Task 1: Ganti "Menu Saya" → "Main Menu" di Header & Hero CTA

**Files:**
- Modify: `app/page.tsx` (2 lokasi: baris ~36 dan ~79)

**Step 1: Baca file dulu**

```bash
# Sudah dibaca di brainstorming — skip jika sudah tahu lokasinya
```

**Step 2: Edit teks di header (baris ~36)**

Cari:
```tsx
Menu Saya
```
Ganti dengan:
```tsx
Main Menu
```

**Step 3: Edit teks di hero CTA (baris ~79)**

Cari:
```tsx
{user ? "Ke Menu Saya" : "Mulai Sekarang"}
```
Ganti dengan:
```tsx
{user ? "Main Menu" : "Mulai Sekarang"}
```

**Step 4: Verifikasi**

Jalankan dev server dan cek navbar saat logged in — pastikan teks sudah berubah.

**Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "fix: rename 'Menu Saya' to 'Main Menu' in navbar and hero CTA"
```

---

## Task 2: Enhanced Hero Section + Stats Bar

**Files:**
- Modify: `app/page.tsx`

**Step 1: Tambah badge di atas headline Hero**

Di dalam `<div className="mx-auto max-w-3xl space-y-6">`, tambah sebelum `<h1>`:

```tsx
<div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent-foreground">
  <span className="h-2 w-2 rounded-full bg-accent" />
  Platform Pelestarian Budaya Digital Indonesia
</div>
```

**Step 2: Perkuat hero background decoration**

Ganti class di `<div className="absolute inset-0 -z-10 ...">`:
```tsx
<div className="absolute inset-0 -z-10">
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/20 via-background to-background" />
  <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
  <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
</div>
```

**Step 3: Tambah Stats Bar section setelah Hero section**

Tambah section baru setelah tag penutup `</section>` Hero dan sebelum Features:

```tsx
{/* Stats Bar */}
<section className="bg-primary py-10">
  <div className="container mx-auto px-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-primary-foreground">
      {[
        { value: "500+", label: "Permainan Terdokumentasi" },
        { value: "34", label: "Provinsi Terwakili" },
        { value: "120+", label: "Komunitas Aktif" },
        { value: "5.000+", label: "Anggota Terdaftar" },
      ].map((stat) => (
        <div key={stat.label}>
          <div className="text-3xl md:text-4xl font-extrabold text-accent">{stat.value}</div>
          <div className="mt-1 text-sm text-primary-foreground/80">{stat.label}</div>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: enhance hero section and add stats bar to landing page"
```

---

## Task 3: Enhanced Features Grid

**Files:**
- Modify: `app/page.tsx` (section `id="features"`)

**Step 1: Tambah heading section sebelum grid**

Di dalam `<section id="features" ...>`, sebelum `<div className="grid ...">`:

```tsx
<div className="text-center mb-12">
  <h2 className="text-3xl font-bold tracking-tight text-foreground">
    Mengapa Nusantara Play?
  </h2>
  <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
    Satu platform untuk mendokumentasikan, memverifikasi, dan merayakan kekayaan permainan rakyat Indonesia.
  </p>
</div>
```

**Step 2: Perkuat konten 3 kartu features**

Ganti seluruh `<div className="grid grid-cols-1 md:grid-cols-3 gap-8">` dengan versi yang lebih lengkap:

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <div className="flex flex-col space-y-4 p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
      <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-xl font-bold">Arsip Terverifikasi</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">
      Setiap permainan dikurasi oleh komunitas lokal dan ahli budaya. Data asal daerah, aturan main, hingga sejarahnya tercatat dengan ketat dan transparan.
    </p>
    <span className="text-xs font-medium text-secondary">Dikurasi komunitas</span>
  </div>

  <div className="flex flex-col space-y-4 p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
      <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
    <h3 className="text-xl font-bold">Komunitas & Event</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">
      Temukan penggiat permainan tradisional di kotamu, ikuti festival budaya, dan daftarkan diri ke event pelestarian yang diselenggarakan komunitas.
    </p>
    <span className="text-xs font-medium text-accent-foreground/70">Dari komunitas, untuk komunitas</span>
  </div>

  <div className="flex flex-col space-y-4 p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    </div>
    <h3 className="text-xl font-bold">Sertifikasi Budaya</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">
      Kontribusimu dalam mendokumentasikan permainan rakyat mendapat apresiasi digital resmi. Bangun portofolio budayamu dan akui keahlianmu.
    </p>
    <span className="text-xs font-medium text-primary">Apresiasi nyata</span>
  </div>
</div>
```

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: enhance features grid with section heading and richer card content"
```

---

## Task 4: How It Works Section

**Files:**
- Modify: `app/page.tsx` — tambah section baru setelah Features

**Step 1: Tambah section "Cara Kerja"**

Tambah setelah closing `</section>` Features:

```tsx
{/* How It Works */}
<section className="py-16 md:py-24">
  <div className="container mx-auto px-4">
    <div className="text-center mb-12">
      <h2 className="text-3xl font-bold tracking-tight text-foreground">Cara Kerja</h2>
      <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
        Tiga langkah sederhana untuk mulai berkontribusi melestarikan budaya bangsa.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
      {/* Connector line (hidden on mobile) */}
      <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-border" />

      {[
        {
          step: "01",
          title: "Daftar Akun",
          desc: "Buat akun gratis dengan email. Tidak perlu kartu kredit, tidak ada biaya tersembunyi.",
          color: "bg-primary/10 text-primary",
        },
        {
          step: "02",
          title: "Jelajahi & Pelajari",
          desc: "Telusuri ratusan permainan rakyat dari seluruh Nusantara. Filter berdasarkan provinsi, kategori, atau kata kunci.",
          color: "bg-accent/10 text-accent-foreground",
        },
        {
          step: "03",
          title: "Berkontribusi",
          desc: "Dokumentasikan permainan dari daerahmu, ikuti event komunitas, dan bangun warisan budaya bersama.",
          color: "bg-secondary/10 text-secondary",
        },
      ].map((item) => (
        <div key={item.step} className="flex flex-col items-center text-center space-y-4">
          <div className={`w-16 h-16 rounded-full ${item.color} flex items-center justify-center text-2xl font-extrabold`}>
            {item.step}
          </div>
          <h3 className="text-lg font-bold">{item.title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">{item.desc}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add 'How It Works' section to landing page"
```

---

## Task 5: Featured Games Section

**Files:**
- Modify: `app/page.tsx` — tambah section setelah How It Works

**Step 1: Tambah section "Permainan Unggulan"**

Tambah setelah closing `</section>` How It Works:

```tsx
{/* Featured Games */}
<section className="py-16 md:py-24 bg-muted/30">
  <div className="container mx-auto px-4">
    <div className="text-center mb-12">
      <h2 className="text-3xl font-bold tracking-tight text-foreground">Permainan Unggulan</h2>
      <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
        Sebagian kecil dari ratusan permainan rakyat yang telah terdokumentasi di platform kami.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        {
          name: "Congklak",
          origin: "Jawa & Sumatera",
          desc: "Permainan strategi menggunakan papan berlubang dan biji-bijian yang mengajarkan perhitungan dan kesabaran.",
          tag: "Strategi",
          tagColor: "bg-secondary/10 text-secondary",
        },
        {
          name: "Egrang",
          origin: "Seluruh Nusantara",
          desc: "Permainan keseimbangan menggunakan galah bambu yang melatih koordinasi tubuh dan keberanian.",
          tag: "Fisik",
          tagColor: "bg-primary/10 text-primary",
        },
        {
          name: "Gobak Sodor",
          origin: "Jawa Tengah",
          desc: "Permainan tim yang melatih kecepatan, strategi, dan kerja sama dalam melewati garis penjaga.",
          tag: "Tim",
          tagColor: "bg-accent/10 text-accent-foreground",
        },
        {
          name: "Petak Umpet",
          origin: "Seluruh Nusantara",
          desc: "Permainan klasik yang mengasah kepekaan, kesabaran, dan kemampuan berpikir taktis anak-anak.",
          tag: "Klasik",
          tagColor: "bg-secondary/10 text-secondary",
        },
      ].map((game) => (
        <div
          key={game.name}
          className="flex flex-col space-y-3 p-5 bg-background rounded-lg border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-foreground">{game.name}</h3>
            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${game.tagColor}`}>
              {game.tag}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">{game.origin}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{game.desc}</p>
        </div>
      ))}
    </div>

    <div className="text-center mt-10">
      <Link
        href="/prot"
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
      >
        Lihat Semua Permainan
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add featured games section to landing page"
```

---

## Task 6: CTA Banner Section

**Files:**
- Modify: `app/page.tsx` — tambah section sebelum Footer

**Step 1: Tambah CTA Banner**

Tambah setelah closing `</section>` Featured Games dan sebelum `</main>`:

```tsx
{/* CTA Banner */}
<section id="community" className="py-20 bg-primary">
  <div className="container mx-auto px-4 text-center">
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
        Mulai Lestarikan Budaya Bermain Hari Ini
      </h2>
      <p className="text-primary-foreground/80 text-lg">
        Bergabunglah dengan ribuan penggiat budaya yang telah mendokumentasikan permainan rakyat Nusantara. Gratis, terbuka, dan dibangun bersama komunitas.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
        <Link
          href={user ? "/menu" : "/signup"}
          className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-8 text-sm font-bold text-accent-foreground shadow transition-colors hover:bg-accent/90"
        >
          {user ? "Ke Main Menu" : "Daftar Gratis Sekarang"}
        </Link>
        <Link
          href="/prot"
          className="inline-flex h-12 items-center justify-center rounded-md border border-primary-foreground/30 px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
        >
          Jelajahi Arsip PROT
        </Link>
      </div>
    </div>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add CTA banner section to landing page"
```

---

## Task 7: Enhanced Footer

**Files:**
- Modify: `app/page.tsx` — ganti footer yang ada

**Step 1: Ganti footer dengan versi lebih lengkap**

Ganti seluruh `<footer>...</footer>` dengan:

```tsx
<footer className="border-t border-border bg-background">
  <div className="container mx-auto px-4 py-12">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Brand */}
      <div className="space-y-3 md:col-span-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded-sm rotate-45" />
          <span className="text-lg font-bold text-primary">Nusantara Play</span>
        </Link>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Platform digital untuk mendokumentasikan, memverifikasi, dan melestarikan permainan rakyat Nusantara bagi generasi mendatang.
        </p>
      </div>

      {/* Navigasi */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Navigasi</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link href="/prot" className="hover:text-foreground transition-colors">Jelajahi PROT</Link></li>
          <li><Link href="/calendar" className="hover:text-foreground transition-colors">Kalender Event</Link></li>
          <li><Link href="/signup" className="hover:text-foreground transition-colors">Daftar Akun</Link></li>
          <li><Link href="/login" className="hover:text-foreground transition-colors">Masuk</Link></li>
        </ul>
      </div>

      {/* Legal */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Legal</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link href="#" className="hover:text-foreground transition-colors">Kebijakan Privasi</Link></li>
          <li><Link href="#" className="hover:text-foreground transition-colors">Syarat & Ketentuan</Link></li>
        </ul>
      </div>
    </div>

    <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
      <p className="text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Nusantara Play. Dibuat dengan cinta untuk budaya Indonesia.
      </p>
      <p className="text-xs text-muted-foreground">
        Seluruh hak cipta dilindungi undang-undang.
      </p>
    </div>
  </div>
</footer>
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: enhance footer with brand description and navigation columns"
```

---

## Task 8: Verifikasi Final

**Step 1: Jalankan dev server**

```bash
pnpm dev
```

**Step 2: Cek setiap section di browser**

Buka `http://localhost:3000` dan verifikasi:
- [ ] Header: teks "Main Menu" muncul saat logged in
- [ ] Hero: badge "Platform Pelestarian..." muncul di atas headline
- [ ] Stats Bar: 4 angka dengan background merah bata
- [ ] Features: heading "Mengapa Nusantara Play?" + 3 kartu dengan hover shadow
- [ ] How It Works: 3 langkah dengan nomor besar
- [ ] Featured Games: 4 kartu permainan + tombol "Lihat Semua"
- [ ] CTA Banner: background merah bata, 2 button
- [ ] Footer: 4 kolom grid

**Step 3: Cek responsivitas**

Resize browser ke mobile (375px) — semua grid harus stack menjadi 1 kolom.

**Step 4: Cek tidak ada error di console**

Tidak boleh ada hydration error, tidak boleh ada warning tentang client component.

**Step 5: Commit final jika ada cleanup**

```bash
git add app/page.tsx
git commit -m "refactor: complete landing page content overhaul"
```
