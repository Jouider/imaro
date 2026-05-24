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

const { generateAnnexePdf } = await import('../src/lib/annexes-pdf.ts')

const ctx = {
  residenceName: 'Atlas Casablanca',
  exerciceLabel: 'Exercice clos le 31 décembre 2026',
  exercice: 2026,
  generatedAtIso: '2026-05-24T13:30:00Z',
}

generateAnnexePdf('10', ctx)
generateAnnexePdf('13-1', ctx)
generateAnnexePdf('13-2', ctx)

console.log('\nDone — open /tmp/imaro-annexe10_2026.pdf etc.')
