import React, { useEffect, useState } from 'react'
import { Landmark, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { api, fmt, faDigits, prettyDate } from '../lib/util.js'
import { PageHead, Empty, Stat, useToast } from '../components/ui.jsx'

const STATUS = { pending: ['در انتظار', 'blue'], cleared: ['وصول شد', 'green'], bounced: ['برگشتی', 'red'] }

export default function Checks({ go }) {
  const toast = useToast()
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState([])
  const load = () => api('checks.list', { status: tab || undefined }).then(setRows)
  useEffect(() => { load() }, [tab])

  async function setStatus(id, s) {
    await api('checks.setStatus', id, s)
    toast(s === 'cleared' ? 'چک وصول شد' : s === 'bounced' ? 'چک برگشتی ثبت شد' : 'وضعیت برگشت داده شد')
    load()
  }
  const total = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="page">
      <PageHead title="چک‌ها" sub="پیگیری چک‌های دریافتی و سررسیدها" />
      <div className="tabs">
        {[['pending', 'در انتظار'], ['cleared', 'وصول شده'], ['bounced', 'برگشتی'], ['', 'همه']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div className="stats one"><Stat label={`جمع ${faDigits(rows.length)} چک`} value={total} icon={Landmark} tone="violet" /></div>
      <div className="card no-pad">
        {rows.length === 0 ? <Empty icon={Landmark} text="چکی در این بخش نیست" /> : (
          <table className="table">
            <thead><tr><th>سررسید</th><th>مشتری</th><th>شماره چک</th><th>بانک</th><th>مبلغ</th><th>فاکتور</th><th>وضعیت</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.due_date ? prettyDate(r.due_date) : <span className="muted">—</span>}
                    {r.status === 'pending' && r.days_left !== null && (
                      <div className={`small ${r.days_left < 0 ? 'red' : r.days_left <= 3 ? 'amber' : 'muted'}`}>
                        {r.days_left < 0 ? `${faDigits(-r.days_left)} روز گذشته` : r.days_left === 0 ? 'امروز' : `${faDigits(r.days_left)} روز مانده`}
                      </div>
                    )}
                  </td>
                  <td>{r.customer_name || <span className="muted">—</span>}</td>
                  <td>{faDigits(r.check_number)}</td>
                  <td>{r.bank}</td>
                  <td className="num-cell"><b>{fmt(r.amount)}</b></td>
                  <td><button className="link" onClick={() => go('invoices', { open: r.invoice_id })}>{faDigits(r.invoice_number)}</button></td>
                  <td><span className={`badge ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span></td>
                  <td className="row-actions">
                    {r.status === 'pending' ? (<>
                      <button className="btn ghost sm" onClick={() => setStatus(r.id, 'cleared')}><CheckCircle2 size={15} /> وصول</button>
                      <button className="btn ghost sm danger" onClick={() => setStatus(r.id, 'bounced')}><XCircle size={15} /> برگشت</button>
                    </>) : (
                      <button className="btn ghost sm" onClick={() => setStatus(r.id, 'pending')}><RotateCcw size={15} /> در انتظار</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
