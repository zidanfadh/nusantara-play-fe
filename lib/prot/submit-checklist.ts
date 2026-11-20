/**
 * Phase 26: the short checklist the contributor ticks before "Ajukan Verifikasi" / "Ajukan Ulang" (from
 * docs/panduan-input-prot.md, section 7). Kept in the browser only: the backend has no field for it (Phase 26 report).
 */
export interface ChecklistItem {
  id: string;
  label: string;
}

export const SUBMIT_CHECKLIST: readonly ChecklistItem[] = [
  { id: 'teks', label: 'Semua teks sudah lengkap dan tidak terpotong (cara bermain, sejarah, nilai moral, deskripsi).' },
  { id: 'foto', label: 'Setiap foto sudah saya buka dan memang menampilkan permainan INI (atau alatnya).' },
  { id: 'data-pribadi', label: 'Tidak ada data pribadi di dokumen atau foto (NIK/KTP, telepon, email, alamat rumah, tanda tangan).' },
  { id: 'wajah-anak', label: 'Tidak ada wajah anak yang dikenali tanpa izin tertulis orang tua/wali.' },
  { id: 'tautan', label: 'Setiap tautan pembelian sudah saya buka dan menuju produk yang benar (alat permainan ini).' },
];

export function checklistComplete(checked: ReadonlySet<string> | readonly string[]): boolean {
  const set = checked instanceof Set ? checked : new Set(checked as readonly string[]);
  return SUBMIT_CHECKLIST.every((item) => set.has(item.id));
}

export function toggleChecklist(checked: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(checked);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
