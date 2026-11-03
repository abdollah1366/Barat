// لایه دیتابیس: SQLite (sql.js) که در یک فایل روی دیسک ذخیره می‌شود
const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')
const jalaali = require('jalaali-js')

let db = null
let dbPath = null
let saveTimer = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  note TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'متر',
  buy_price REAL DEFAULT 0,
  sell_price REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number INTEGER NOT NULL,
  date TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty REAL DEFAULT 0,
  buy_price REAL DEFAULT 0,
  sell_price REAL DEFAULT 0,
  cost REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('cash','check')),
  amount REAL DEFAULT 0,
  date TEXT,
  check_number TEXT DEFAULT '',
  bank TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  status TEXT DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
`

async function open(file) {
  dbPath = file
  const SQL = await initSqlJs({
    wasmBinary: fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'))
  })
  db = fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database()
  db.run('PRAGMA foreign_keys = ON;')
  db.run(SCHEMA)
  saveNow()
}

function saveNow() {
  if (!db) return
  clearTimeout(saveTimer)
  saveTimer = null
  const data = Buffer.from(db.export())
  const tmp = dbPath + '.tmp'
  fs.writeFileSync(tmp, data)
  fs.renameSync(tmp, dbPath)
}
function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNow, 300)
}

function all(sql, params = {}) {
  const st = db.prepare(sql)
  st.bind(params)
  const rows = []
  while (st.step()) rows.push(st.getAsObject())
  st.free()
  return rows
}
const one = (sql, params) => all(sql, params)[0] || null
function run(sql, params = {}) {
  db.run(sql, params)
  return one('SELECT last_insert_rowid() AS id').id
}
function tx(fn) {
  db.run('BEGIN')
  try {
    const r = fn()
    db.run('COMMIT')
    save()
    return r
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  }
}

// ---------- تاریخ ----------
const pad = (n) => String(n).padStart(2, '0')
function today() {
  const d = new Date()
  const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`
}
function daysUntil(jdate) {
  if (!jdate) return null
  const [y, m, d] = jdate.split('/').map(Number)
  if (!jalaali.isValidJalaaliDate(y, m, d)) return null
  const g = jalaali.toGregorian(y, m, d)
  const target = Date.UTC(g.gy, g.gm - 1, g.gd)
  const n = new Date()
  const now = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())
  return Math.round((target - now) / 86400000)
}

// ---------- مشتری ----------
const customers = {
  list: () => all(`
    SELECT c.*,
      COALESCE((SELECT SUM(ii.qty*ii.sell_price) FROM invoice_items ii JOIN invoices i ON i.id=ii.invoice_id WHERE i.customer_id=c.id),0) AS total,
      COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE i.customer_id=c.id AND p.status!='bounced'),0) AS paid
    FROM customers c ORDER BY c.name`),
  save: (c) => tx(() => {
    if (!c.name || !c.name.trim()) throw new Error('نام مشتری را وارد کنید')
    const p = { $name: c.name.trim(), $phone: c.phone || '', $note: c.note || '' }
    if (c.id) { run('UPDATE customers SET name=$name, phone=$phone, note=$note WHERE id=$id', { ...p, $id: c.id }); return c.id }
    return run('INSERT INTO customers (name,phone,note) VALUES ($name,$phone,$note)', p)
  }),
  remove: (id) => tx(() => run('DELETE FROM customers WHERE id=$id', { $id: id }))
}

// ---------- کالا ----------
const products = {
  list: () => all('SELECT * FROM products ORDER BY name'),
  save: (p) => tx(() => {
    if (!p.name || !p.name.trim()) throw new Error('نام کالا را وارد کنید')
    const v = { $name: p.name.trim(), $unit: p.unit || 'متر', $buy: +p.buy_price || 0, $sell: +p.sell_price || 0 }
    if (p.id) { run('UPDATE products SET name=$name, unit=$unit, buy_price=$buy, sell_price=$sell WHERE id=$id', { ...v, $id: p.id }); return p.id }
    return run('INSERT INTO products (name,unit,buy_price,sell_price) VALUES ($name,$unit,$buy,$sell)', v)
  }),
  remove: (id) => tx(() => run('DELETE FROM products WHERE id=$id', { $id: id }))
}

// ---------- فاکتور ----------
const INVOICE_SUMMARY = `
  SELECT i.*, c.name AS customer_name,
    COALESCE(t.total,0) AS total, COALESCE(t.cost,0) AS cost, COALESCE(t.profit,0) AS profit, COALESCE(t.qty,0) AS qty,
    COALESCE(pc.cash,0) AS cash, COALESCE(pc.checks,0) AS checks
  FROM invoices i
  LEFT JOIN customers c ON c.id = i.customer_id
  LEFT JOIN (
    SELECT invoice_id, SUM(qty*sell_price) AS total, SUM(cost) AS cost, SUM(qty) AS qty,
           SUM((sell_price-buy_price)*qty - cost) AS profit
    FROM invoice_items GROUP BY invoice_id) t ON t.invoice_id = i.id
  LEFT JOIN (
    SELECT invoice_id,
      SUM(CASE WHEN type='cash' THEN amount ELSE 0 END) AS cash,
      SUM(CASE WHEN type='check' AND status!='bounced' THEN amount ELSE 0 END) AS checks
    FROM payments GROUP BY invoice_id) pc ON pc.invoice_id = i.id`

const invoices = {
  list: ({ from, to, q } = {}) => {
    const where = []
    const p = {}
    if (from) { where.push('i.date >= $from'); p.$from = from }
    if (to) { where.push('i.date <= $to'); p.$to = to }
    if (q) {
      where.push(`(CAST(i.number AS TEXT) LIKE $q OR c.name LIKE $q OR EXISTS (SELECT 1 FROM invoice_items x WHERE x.invoice_id=i.id AND x.product_name LIKE $q))`)
      p.$q = `%${q}%`
    }
    return all(`${INVOICE_SUMMARY} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY i.date DESC, i.number DESC`, p)
  },
  get: (id) => {
    const inv = one('SELECT * FROM invoices WHERE id=$id', { $id: id })
    if (!inv) return null
    inv.items = all('SELECT * FROM invoice_items WHERE invoice_id=$id ORDER BY id', { $id: id })
    inv.payments = all('SELECT * FROM payments WHERE invoice_id=$id ORDER BY id', { $id: id })
    return inv
  },
  nextNumber: () => (one('SELECT MAX(number) AS n FROM invoices').n || 110) + 1,
  save: (inv) => tx(() => {
    if (!inv.date) throw new Error('تاریخ فاکتور را وارد کنید')
    const items = (inv.items || []).filter((x) => x.product_name && x.product_name.trim())
    if (!items.length) throw new Error('حداقل یک ردیف کالا وارد کنید')
    const dup = one('SELECT id FROM invoices WHERE number=$n AND id!=$id', { $n: +inv.number, $id: inv.id || 0 })
    if (dup) throw new Error('این شماره فاکتور قبلاً ثبت شده است')
    const v = { $number: +inv.number, $date: inv.date, $cid: inv.customer_id || null, $note: inv.note || '' }
    let id = inv.id
    if (id) {
      run('UPDATE invoices SET number=$number, date=$date, customer_id=$cid, note=$note WHERE id=$id', { ...v, $id: id })
      run('DELETE FROM invoice_items WHERE invoice_id=$id', { $id: id })
      run('DELETE FROM payments WHERE invoice_id=$id', { $id: id })
    } else {
      id = run('INSERT INTO invoices (number,date,customer_id,note) VALUES ($number,$date,$cid,$note)', v)
    }
    for (const it of items) {
      run(`INSERT INTO invoice_items (invoice_id,product_id,product_name,qty,buy_price,sell_price,cost)
           VALUES ($inv,$pid,$name,$qty,$buy,$sell,$cost)`, {
        $inv: id, $pid: it.product_id || null, $name: it.product_name.trim(),
        $qty: +it.qty || 0, $buy: +it.buy_price || 0, $sell: +it.sell_price || 0, $cost: +it.cost || 0
      })
    }
    for (const p of inv.payments || []) {
      if (!(+p.amount > 0)) continue
      run(`INSERT INTO payments (invoice_id,type,amount,date,check_number,bank,due_date,status)
           VALUES ($inv,$type,$amount,$date,$num,$bank,$due,$status)`, {
        $inv: id, $type: p.type === 'check' ? 'check' : 'cash', $amount: +p.amount,
        $date: p.date || inv.date, $num: p.check_number || '', $bank: p.bank || '',
        $due: p.due_date || '', $status: p.type === 'check' ? (p.status || 'pending') : 'cleared'
      })
    }
    return id
  }),
  remove: (id) => tx(() => run('DELETE FROM invoices WHERE id=$id', { $id: id }))
}

// ---------- چک ----------
const checks = {
  list: ({ status } = {}) => {
    const rows = all(`
      SELECT p.*, i.number AS invoice_number, i.date AS invoice_date, c.name AS customer_name
      FROM payments p JOIN invoices i ON i.id=p.invoice_id LEFT JOIN customers c ON c.id=i.customer_id
      WHERE p.type='check' ${status ? 'AND p.status=$status' : ''}
      ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END, p.due_date`, status ? { $status: status } : {})
    return rows.map((r) => ({ ...r, days_left: daysUntil(r.due_date) }))
  },
  setStatus: (id, status) => tx(() => run('UPDATE payments SET status=$s WHERE id=$id AND type=\'check\'', { $s: status, $id: id }))
}

// ---------- گزارش ----------
function summary(from, to) {
  const p = { $from: from || '0000/00/00', $to: to || '9999/99/99' }
  const s = one(`
    SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS total, COALESCE(SUM(cost),0) AS cost,
           COALESCE(SUM(profit),0) AS profit, COALESCE(SUM(qty),0) AS qty,
           COALESCE(SUM(cash),0) AS cash, COALESCE(SUM(checks),0) AS checks
    FROM (${INVOICE_SUMMARY} WHERE i.date BETWEEN $from AND $to)`, p)
  s.remaining = s.total - s.cash - s.checks
  return s
}

const reports = {
  summary,
  byDay: (from, to) => all(`
    SELECT date, COUNT(*) AS count, SUM(total) AS total, SUM(profit) AS profit, SUM(cash) AS cash, SUM(checks) AS checks
    FROM (${INVOICE_SUMMARY} WHERE i.date BETWEEN $from AND $to) GROUP BY date ORDER BY date`,
  { $from: from || '0000/00/00', $to: to || '9999/99/99' }),
  byProduct: (from, to) => all(`
    SELECT ii.product_name AS name, SUM(ii.qty) AS qty, SUM(ii.qty*ii.sell_price) AS total,
           SUM((ii.sell_price-ii.buy_price)*ii.qty - ii.cost) AS profit
    FROM invoice_items ii JOIN invoices i ON i.id=ii.invoice_id
    WHERE i.date BETWEEN $from AND $to GROUP BY ii.product_name ORDER BY profit DESC`,
  { $from: from || '0000/00/00', $to: to || '9999/99/99' }),
  // ردیف‌های قلم به قلم مثل فایل اکسل قدیمی
  lines: (from, to) => all(`
    SELECT i.id AS invoice_id, i.number, i.date, c.name AS customer_name, ii.product_name, ii.qty, ii.buy_price, ii.sell_price,
           ii.qty*ii.sell_price AS total, ii.cost, (ii.sell_price-ii.buy_price)*ii.qty - ii.cost AS profit
    FROM invoice_items ii JOIN invoices i ON i.id=ii.invoice_id LEFT JOIN customers c ON c.id=i.customer_id
    WHERE i.date BETWEEN $from AND $to ORDER BY i.date, i.number, ii.id`,
  { $from: from || '0000/00/00', $to: to || '9999/99/99' })
}

function dashboard() {
  const t = today()
  const monthStart = t.slice(0, 8) + '01'
  const pending = checks.list({ status: 'pending' })
  return {
    today: t,
    day: summary(t, t),
    month: summary(monthStart, t),
    all: summary(),
    upcomingChecks: pending.filter((c) => c.days_left !== null && c.days_left <= 7),
    pendingChecksTotal: pending.reduce((s, c) => s + c.amount, 0),
    recent: invoices.list().slice(0, 6),
    counts: one('SELECT (SELECT COUNT(*) FROM customers) AS customers, (SELECT COUNT(*) FROM products) AS products')
  }
}

module.exports = { open, saveNow, today, customers, products, invoices, checks, reports, dashboard, get path() { return dbPath } }
