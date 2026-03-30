# Admin Panel Structure

## Overview
Admin panel untuk Nusantara Legacy dengan role-based access control (hanya untuk `admin_kpoti`).

## Routes
- `/admin/dashboard` - Dashboard utama dengan statistik
- `/admin/users` - Kelola pengguna
- `/admin/audit` - Lihat audit logs
- `/admin/daerah` - Kelola data daerah

## Components

### AdminSidebar
Path: `components/admin/AdminSidebar.tsx`
- Navigation menu untuk admin panel
- Deteksi active state berdasarkan pathname
- Menu items: Dashboard, User Management, Audit Logs, Daerah

### AdminHeader
Path: `components/admin/AdminHeader.tsx`
- Header dengan user info, notifications, dan logout button
- Menampilkan nama user, role, dan avatar
- Logout functionality menggunakan Supabase

## Layout
Path: `app/(admin)/layout.tsx`
- Role check: hanya `admin_kpoti` yang bisa akses
- Redirect ke `/unauthorized` jika user tidak punya akses
- Loading state saat check user
- Struktur: Sidebar (kiri) + Header (atas) + Content (tengah)

## Pages

### Dashboard
Path: `app/(admin)/dashboard/page.tsx`
- Statistik pengguna (total users)
- Statistik daerah (total, provinsi, kabupaten, kota)
- Quick actions ke halaman users, audit, daerah

### Unauthorized
Path: `app/unauthorized/page.tsx`
- Halaman 403 error
- Ditampilkan saat user tanpa izin mencoba akses admin panel
- Link kembali ke dashboard atau profile

## Authorization
Semua halaman di dalam `(admin)` route group akan:
1. Check user role via `useCurrentUser` hook
2. Redirect ke `/unauthorized` jika bukan `admin_kpoti`
3. Show loading state selama check user

## API Endpoints Used
- `getUserStats()` - Get total users
- `getDaerahStats()` - Get daerah statistics
- `getAllUsers()` - List all users (admin users page)
- `getAllAuditLogs()` - List audit logs (admin audit page)
- `getAllDaerah()` - List all daerah (admin daerah page)
