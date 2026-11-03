import React, { useEffect, useState } from 'react'
import { Plus, Search, Trash2, Pencil, FileText, FileSpreadsheet } from 'lucide-react'
import { api, fmt, faDigits, prettyDate, todayJ, monthStart } from '../lib/util.js'
import { PageHead, DateInput, Empty, Confirm, useToast } from '../components/ui.jsx'
import InvoiceEditor from './InvoiceEditor.jsx'

export default function Invoices({ intent, clearIntent }) {
  const toast = useToast()
  const [filter, setFilter] = useState({ from: monthStart(), to: todayJ(), q: '' })
  const [rows, setRows] = useState([])
  const [editing, setEditing] = useState(null) // null | 'new' | id
  const [del, setDel] = useState(null)

  const load = () => api('invoices.list', filter).then(setRows)
  useEffect(() => { load() }, [filter])
  useEffect(() => {
    if (intent === 'new') setEditing('new')
    else if (intent?.open) setEditing(intent.open)
    if (intent) clearIntent()
  }, [intent])

  const sum = rows.reduce((s, r) => ({
    total: s.total + r.total, profit: s.profit + r.profit, cash: s.cash + r.cash, checks: s.checks + r.checks
  }), { total: 0, profit: 0, cash: 0, checks: 0 })

  async function remove() {
    await api('invoices.remove', del.id)
    toast('فاکتور حذف شد')
    setDel(null)
    load()
  }

  async function exportXlsx() {
    try {
      const f = await api('app.exportExcel', filter.from, filter.to)
      if (f) toast('فایل اکسل ساخته شد')
    } catch (e) { toast(e.message, 'err') }
  }

  return (
    <div className="page">
      <PageHead title="فاکتورها" sub="ثبت و مدیریت فاکتورهای فروش">
        <button className="btn ghost" onClick={exportXlsx}><FileSpreadsheet size={18} /> خروجی اکسل</button>
        <button className="btn primary" onClick={() => setEditing('new')}><Plus size={18} /> فاکتور جدید</button>
      </PageHead>

      <div className="toolbar card">
        <div className="search">
          <Search size={17} />
          <input placeholder="جستجو: شماره، مشتری یا کالا" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
        </div>
        <span className="muted">از</span>
        <DateInput value={filter.from} onChange={(v) => setFilter({ ...filter, from: v })} />
        <span className="muted">تا</span>
        <DateInput value={filter.to} onChange={(v) => setFilter({ ...filter, to: v })} />
        <button className="btn ghost sm" onClick={() => setFilter({ ...filter, from: todayJ(), to: todayJ() })}>امروز</button>
        <button className="btn ghost sm" onClick={() => setFilter({ ...filter, from: monthStart(), to: todayJ() })}>این ماه</button>
        <button className="btn ghost sm" onClick={() => setFilter({ ...filter, from: '', to: '' })}>همه</button>
      </div>

      <div className="card no-pad">
        {rows.length === 0 ? (
          <Empty icon={FileText} text="فاکتوری در این بازه پیدا نشد" action={<button className="btn primary sm" onClick={() => setEditing('new')}>فاکتور جدید</button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>شماره</th><th>تاریخ</th><th>مشتری</th><th>متراژ</th><th>جمع فاکتور</th><th>هزینه</th><th>سود</th><th>نقد</th><th>چک</th><th>مانده</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rem = r.total - r.cash - r.checks
                  return (
                    <tr key={r.id} className="clickable" onDoubleClick={() => setEditing(r.id)}>
                      <td><b>{faDigits(r.number)}</b></td>
                      <td>{prettyDate(r.date)}</td>
                      <td>{r.customer_name || <span className="muted">—</span>}</td>
                      <td className="num-cell">{fmt(r.qty)}</td>
                      <td className="num-cell"><b>{fmt(r.total)}</b></td>
                      <td className="num-cell">{fmt(r.cost)}</td>
                      <td className={`num-cell ${r.profit < 0 ? 'red' : 'green'}`}>{fmt(r.profit)}</td>
                      <td className="num-cell">{fmt(r.cash)}</td>
                      <td className="num-cell">{fmt(r.checks)}</td>
                      <td className="num-cell">{rem > 0.5 ? <span className="badge red">{fmt(rem)}</span> : <span className="badge green">تسویه</span>}</td>
                      <td className="row-actions">
                        <button className="icon-btn" title="ویرایش" onClick={() => setEditing(r.id)}><Pencil size={16} /></button>
                        <button className="icon-btn danger" title="حذف" onClick={() => setDel(r)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>جمع ({faDigits(rows.length)} فاکتور)</td>
                  <td className="num-cell">{fmt(sum.total)}</td><td></td>
                  <td className="num-cell green">{fmt(sum.profit)}</td>
                  <td className="num-cell">{fmt(sum.cash)}</td>
                  <td className="num-cell">{fmt(sum.checks)}</td>
                  <td className="num-cell">{fmt(sum.total - sum.cash - sum.checks)}</td><td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <InvoiceEditor id={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
      {del && <Confirm text={`فاکتور شماره ${faDigits(del.number)} حذف شود؟`} onYes={remove} onNo={() => setDel(null)} />}
    </div>
  )
}
