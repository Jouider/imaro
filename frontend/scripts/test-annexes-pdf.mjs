/**
 * Manual test — generates the 3 annexe PDFs to /tmp so we can compare with Kassaba.
 * Run: cd frontend && npx tsx scripts/test-annexes-pdf.mjs
 */
import { jsPDF } from 'jspdf'
import { writeFileSync } from 'fs'

// Patch jsPDF.save to write to /tmp instead of triggering download
jsPDF.prototype.save = function (filename) {
  const buf = this.output('arraybuffer')
  const path = '/tmp/imaro-' + filename
  writeFileSync(path, Buffer.from(buf))
  console.log('✅  Wrote', path, '(' + buf.byteLength + ' bytes)')
  return this
}

const annexesMod = await import('../src/lib/annexes-pdf.ts')
const {
  generateAnnexe3Pdf,
  generateAnnexe4Pdf,
  generateAnnexe5Pdf,
  generateAnnexe6Pdf,
  generateAnnexe7Pdf,
  generateAnnexe8Pdf,
  generateAnnexe9Pdf,
  generateAnnexe10Pdf,
  generateAnnexe11Pdf,
  generateAnnexe12Pdf,
  generateAnnexe131Pdf,
  generateAnnexe132Pdf,
  generateAnnexePdf,
} = annexesMod

const ctx = {
  residenceName: 'Atlas Casablanca',
  exerciceLabel: 'Exercice clos le 31 décembre 2026',
  exercice: 2026,
  generatedAtIso: '2026-05-24T13:30:00Z',
}

// Annexe 10 — realistic test data (4 copropriétaires)
await generateAnnexe10Pdf({
  ...ctx,
  rows: [
    {
      lotNumero: 'A-01',
      coproprietaireNom: 'Hassan Benali',
      soldeInitial: 0,
      appele: 4800,
      paye: 4800,
      soldeFinal: 0,
    },
    {
      lotNumero: 'A-02',
      coproprietaireNom: 'Fatima Chraibi',
      soldeInitial: 0,
      appele: 5200,
      paye: 3500,
      soldeFinal: -1700,
    },
    {
      lotNumero: 'B-01',
      coproprietaireNom: 'Karim El Fassi',
      soldeInitial: 0,
      appele: 3600,
      paye: 0,
      soldeFinal: -3600,
    },
    {
      lotNumero: 'P-01',
      coproprietaireNom: 'Saïd Bennani',
      soldeInitial: 0,
      appele: 900,
      paye: 900,
      soldeFinal: 0,
    },
  ],
  totals: { soldeInitial: 0, appele: 14500, paye: 9200, soldeFinal: -5300 },
})

// Annexe 13-1 — basic balance with some non-zero values
await generateAnnexe131Pdf({
  ...ctx,
  current: {
    fondsReserve: 25000,
    creances: 5300,
    dettes: 1200,
    tresorerie: 18500,
  },
  previous: {
    fondsReserve: 22000,
    creances: 3100,
    dettes: 800,
    tresorerie: 21000,
  },
})

// Annexe 13-2 — sample P&L with budget vs realized
const q = (n1, n, n0, nMinus1) => ({ n1, n, n0, nMinus1 })
await generateAnnexe132Pdf({
  ...ctx,
  excedent: 3000,
  recettes: {
    cotisations: q(18000, 14500, 14000, 13200),
    fondsReserve: q(3000, 3000, 3000, 2500),
    autresAg: q(0, 0, 0, 0),
    autresProduits: q(500, 300, 500, 200),
  },
  depenses: {
    matieres: q(4500, 4200, 4500, 4100),
    servicesExterieurs: q(8000, 7800, 7500, 7100),
    impotsTaxes: q(800, 800, 800, 800),
    personnel: q(2400, 1900, 2400, 2400),
    autresCharges: q(1500, 100, 1500, 50),
  },
})

// All other annexes — generate with zero defaults via the dispatcher
// (real data flows in from backend; here we just verify rendering).
for (const num of ['3', '4', '5', '6', '7', '8', '9', '11', '12']) {
  await generateAnnexePdf(num, ctx)
}

console.log('\nDone — 12 annexe PDFs generated.')
// Suppress unused-import warnings when running the script
void generateAnnexe3Pdf
void generateAnnexe4Pdf
void generateAnnexe5Pdf
void generateAnnexe6Pdf
void generateAnnexe7Pdf
void generateAnnexe8Pdf
void generateAnnexe9Pdf
void generateAnnexe11Pdf
void generateAnnexe12Pdf
