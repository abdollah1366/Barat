// خروجی اکسل به همان شکل «صورت حساب» فایل قدیمی
const ExcelJS = require('exceljs')

async function exportExcel(file, from, to, db) {
  const lines = db.reports.lines(from, to)
  const sum = db.reports.summary(from, to)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('صورت حساب', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 2 }] })

  const title = from && to ? (from === to ? `صورت حساب مورخه ${from}` : `صورت حساب از ${from} تا ${to}`) : 'صورت حساب کل'
  ws.mergeCells('A1:L1')
  ws.getCell('A1').value = title
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }

  const headers = ['ردیف', 'تاریخ', 'شماره فاکتور', 'مشتری', 'کالا', 'متراژ', 'خرید', 'فروش متری', 'جمع فاکتور', 'هزینه', 'سود']
  ws.getRow(2).values = headers
  ws.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(2).eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
    c.alignment = { horizontal: 'center' }
  })
  ws.columns = [6, 12, 12, 20, 22, 10, 14, 14, 16, 12, 16].map((width) => ({ width }))

  lines.forEach((l, i) => {
    const r = ws.addRow([i + 1, l.date, l.number, l.customer_name || '', l.product_name, l.qty, l.buy_price, l.sell_price, null, l.cost, null])
    const n = r.number
    r.getCell(9).value = { formula: `H${n}*F${n}`, result: l.total }
    r.getCell(11).value = { formula: `(H${n}-G${n})*F${n}-J${n}`, result: l.profit }
  })
  const first = 3
  const last = Math.max(first, 2 + lines.length)
  const t = ws.addRow(['جمع', '', '', '', '', null, '', '', null, null, null])
  t.getCell(6).value = { formula: `SUM(F${first}:F${last})`, result: sum.qty }
  t.getCell(9).value = { formula: `SUM(I${first}:I${last})`, result: sum.total }
  t.getCell(10).value = { formula: `SUM(J${first}:J${last})`, result: sum.cost }
  t.getCell(11).value = { formula: `SUM(K${first}:K${last})`, result: sum.profit }
  t.font = { bold: true }

  ws.addRow([])
  for (const [label, v] of [['دریافتی نقد', sum.cash], ['دریافتی چک', sum.checks], ['جمع دریافتی (نقد + چک)', sum.cash + sum.checks], ['مانده طلب', sum.remaining]]) {
    const r = ws.addRow([label, '', '', '', '', '', '', '', v])
    ws.mergeCells(`A${r.number}:H${r.number}`)
    r.font = { bold: true }
  }
  ws.eachRow((row, i) => {
    if (i < 2) return
    ;[6, 7, 8, 9, 10, 11].forEach((c) => { row.getCell(c).numFmt = '#,##0' })
  })

  await wb.xlsx.writeFile(file)
}

module.exports = { exportExcel }
