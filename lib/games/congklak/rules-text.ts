/**
 * The "Cara bermain" text (Phase 17), built from the rules config, so the sheet always describes exactly
 * the rules the engine plays. Simple Indonesian.
 */
import { totalSeeds, type CongklakRules } from './rules';

export const RULES_VARIANT_NOTE =
  'Aturan congklak berbeda-beda di tiap daerah. Permainan ini memakai satu versi yang umum, "Aturan dasar". Versi lain juga sah dimainkan.';

export interface RulesSection {
  title: string;
  text: string;
}

export function rulesSections(rules: CongklakRules): RulesSection[] {
  const n = rules.holesPerSide;
  const capture = rules.captureRequiresLap
    ? `Biji terakhir jatuh di lubang kosong di sisimu: jika kamu sudah melewati lumbungmu setidaknya sekali pada giliran ini dan lubang di seberangnya berisi, semua biji di seberang itu ditambah biji terakhirmu masuk ke lumbungmu. Setelah itu giliran berpindah.`
    : `Biji terakhir jatuh di lubang kosong di sisimu: jika lubang di seberangnya berisi, semua biji di seberang itu ditambah biji terakhirmu masuk ke lumbungmu. Setelah itu giliran berpindah.`;
  return [
    {
      title: 'Papan',
      text: `Papan punya 2 baris berisi ${n} lubang kecil. Setiap pemain memiliki ${n} lubang di sisinya dan satu lumbung (lubang besar) di ujungnya. Di awal, setiap lubang kecil berisi ${rules.seedsPerHole} biji (${totalSeeds(rules)} biji), lumbung masih kosong.`,
    },
    {
      title: 'Giliranmu',
      text: 'Pilih satu lubang kecil milikmu yang berisi. Ambil semua bijinya, lalu taburkan satu per satu ke lubang berikutnya, berlawanan arah jarum jam (menuju lumbungmu). Lumbungmu ikut diisi, lumbung lawan dilewati.',
    },
    { title: 'Main lagi', text: 'Biji terakhir jatuh di lumbungmu: kamu main sekali lagi.' },
    {
      title: 'Lanjut menabur',
      text: 'Biji terakhir jatuh di lubang kecil yang berisi (di sisi mana pun): ambil semua biji di lubang itu dan lanjutkan menabur.',
    },
    { title: 'Menangkap biji', text: capture },
    { title: 'Berhenti', text: 'Biji terakhir jatuh di lubang kosong di sisi lawan: giliran berpindah.' },
    {
      title: 'Akhir permainan',
      text: 'Jika pemain yang mendapat giliran tidak punya biji lagi di lubang kecilnya, permainan selesai. Lawannya memasukkan semua biji yang tersisa di sisinya ke lumbungnya sendiri. Pemenangnya adalah yang lumbungnya berisi biji terbanyak; jika sama banyak, hasilnya seri.',
    },
  ];
}
