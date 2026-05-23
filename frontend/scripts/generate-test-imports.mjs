/**
 * Generates 5 sample .xlsx files for testing the Import module.
 * Run from frontend/: node scripts/generate-test-imports.mjs
 *
 * Output: frontend/public/test-imports/
 */

import * as XLSX from '../node_modules/xlsx/xlsx.mjs'
import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, '../public/test-imports')

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

function save(wb, filename) {
  const path = join(OUT, filename)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  writeFileSync(path, buf)
  console.log(`✅  ${filename}`)
}

function makeWorkbook(sheetName, rows) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-width columns
  const cols = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? '').length)) + 2,
  }))
  ws['!cols'] = cols

  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

// ── 1. Lots ──────────────────────────────────────────────────────────────────
// Types valides: appartement, commerce, parking, cave, bureau, autre
save(
  makeWorkbook('Lots', [
    { numero: 'A-01', type: 'appartement', etage: 1, superficie: 85.5,  tantieme: 120, immeuble: 'Bât A' },
    { numero: 'A-02', type: 'appartement', etage: 1, superficie: 72.0,  tantieme: 100, immeuble: 'Bât A' },
    { numero: 'A-03', type: 'appartement', etage: 2, superficie: 95.0,  tantieme: 135, immeuble: 'Bât A' },
    { numero: 'B-01', type: 'appartement', etage: 1, superficie: 68.0,  tantieme: 95,  immeuble: 'Bât B' },
    { numero: 'B-02', type: 'autre',       etage: 3, superficie: 130.0, tantieme: 180, immeuble: 'Bât B' },
    { numero: 'P-01', type: 'parking',     etage: 0, superficie: 12.5,  tantieme: 15,  immeuble: 'Sous-sol' },
    { numero: 'P-02', type: 'parking',     etage: 0, superficie: 12.5,  tantieme: 15,  immeuble: 'Sous-sol' },
    { numero: 'C-01', type: 'commerce',    etage: 0, superficie: 45.0,  tantieme: 65,  immeuble: 'Bât A' },
  ]),
  'test-lots.xlsx',
)

// ── 2. Copropriétaires ───────────────────────────────────────────────────────
// Les numéros de lot doivent correspondre à ceux de test-lots.xlsx
save(
  makeWorkbook('Copropriétaires', [
    { nom: 'Karim Benali',         telephone: '0661234567', email: 'k.benali@gmail.com',      lot: 'A-01' },
    { nom: 'Fatima Zahra Idrissi', telephone: '0662345678', email: 'fz.idrissi@gmail.com',    lot: 'A-02' },
    { nom: 'Hassan Oufkir',        telephone: '0663456789', email: '',                         lot: 'A-03' },
    { nom: 'Aicha Moussaoui',      telephone: '0664567890', email: 'a.moussaoui@outlook.com', lot: 'B-01' },
    { nom: 'Mohamed Tazi',         telephone: '0665678901', email: 'm.tazi@yahoo.fr',          lot: 'B-02' },
    { nom: 'Rachida El Fassi',     telephone: '0666789012', email: '',                         lot: 'P-01' },
    { nom: 'Youssef Benkirane',    telephone: '0667890123', email: 'y.benkirane@gmail.com',   lot: 'P-02' },
    { nom: 'Leila Cherkaoui',      telephone: '0668901234', email: 'l.cherkaoui@gmail.com',   lot: 'C-01' },
  ]),
  'test-coproprietaires.xlsx',
)

// ── 3. Soldes initiaux ───────────────────────────────────────────────────────
save(
  makeWorkbook('Soldes initiaux', [
    { lot: 'A-01', solde: 1500.00, date: '2026-01-01' },
    { lot: 'A-02', solde: 0.00,    date: '2026-01-01' },
    { lot: 'A-03', solde: -850.00, date: '2026-01-01' },
    { lot: 'B-01', solde: 2200.50, date: '2026-01-01' },
    { lot: 'B-02', solde: 0.00,    date: '2026-01-01' },
    { lot: 'P-01', solde: 300.00,  date: '2026-01-01' },
    { lot: 'P-02', solde: 0.00,    date: '2026-01-01' },
    { lot: 'C-01', solde: -400.00, date: '2026-01-01' },
  ]),
  'test-soldes.xlsx',
)

// ── 4. Paiements ─────────────────────────────────────────────────────────────
save(
  makeWorkbook('Paiements', [
    { lot: 'A-01', montant: 850.00,  date: '2026-01-15', mode: 'virement', reference: 'VIR-2026-001', trimestre: 'T1-2026' },
    { lot: 'A-01', montant: 850.00,  date: '2026-04-10', mode: 'cheque',   reference: 'CHQ-0042',     trimestre: 'T2-2026' },
    { lot: 'A-02', montant: 720.00,  date: '2026-01-20', mode: 'especes',  reference: '',             trimestre: 'T1-2026' },
    { lot: 'A-02', montant: 720.00,  date: '2026-04-18', mode: 'virement', reference: 'VIR-2026-002', trimestre: 'T2-2026' },
    { lot: 'B-01', montant: 680.00,  date: '2026-02-01', mode: 'cheque',   reference: 'CHQ-0078',     trimestre: 'T1-2026' },
    { lot: 'B-02', montant: 1300.00, date: '2026-01-05', mode: 'virement', reference: 'VIR-2026-003', trimestre: 'T1-2026' },
    { lot: 'C-01', montant: 950.00,  date: '2026-03-30', mode: 'cheque',   reference: 'CHQ-0091',     trimestre: 'T1-2026' },
    { lot: 'P-01', montant: 180.00,  date: '2026-01-10', mode: 'especes',  reference: '',             trimestre: 'T1-2026' },
  ]),
  'test-paiements.xlsx',
)

// ── 5. Prestataires ──────────────────────────────────────────────────────────
save(
  makeWorkbook('Prestataires', [
    { nom: 'TechElev SARL',       metier: 'Ascenseurs',          telephone: '0522334455', email: 'contact@techelev.ma',   ville: 'Casablanca' },
    { nom: 'Clean Pro Maroc',     metier: 'Nettoyage',           telephone: '0522445566', email: 'cleanpro@gmail.com',    ville: 'Casablanca' },
    { nom: 'Gardiennage Atlas',   metier: 'Sécurité',            telephone: '0522556677', email: 'atlas.guard@outlook.com', ville: 'Casablanca' },
    { nom: 'ElectroFix Rabat',    metier: 'Électricité',         telephone: '0537667788', email: 'electrofix@gmail.com',  ville: 'Rabat' },
    { nom: 'Plomberie Express',   metier: 'Plomberie',           telephone: '0522778899', email: '',                       ville: 'Casablanca' },
    { nom: 'Jardin Vert',         metier: 'Espaces verts',       telephone: '0661223344', email: 'jardinvert@gmail.com',  ville: 'Casablanca' },
  ]),
  'test-prestataires.xlsx',
)

console.log(`\n📁  Fichiers créés dans: ${OUT}`)
console.log('   Accessible via: http://localhost:5173/test-imports/<fichier>')
