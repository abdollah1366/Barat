import React, { useEffect, useState } from 'react'
import { Plus, TrendingUp, Wallet, Banknote, Landmark, AlertTriangle, FileText } from 'lucide-react'
import { api, fmt, faDigits, prettyDate } from '../lib/util.js'
import { Stat, PageHead, Empty } from '../components/ui.jsx'

export default function Dashboard({ go }) {
  const [d, setD] = useState(null)
  useEffect(() => { api('dashboard').then(setD) }, [])
  if (!d) return <div className="loading">در حال بارگذاری…</div>

  return (
    <div className="page">
      <PageHead title="سلام 👋" sub={`امروز ${prettyDate(d.today)}`}>
        <button className="btn primary" onClick={() => go('invoices', 'new')}><Plus size={18} /> فاکتور جدید</button>
      </PageHead>

      <h2 className="section-title">امروز</h2>
      <div className="stats">
        <Stat label="فروش امروز" value={d.day.total} icon={FileText} sub={`${faDigits(d.day.count)} فاکتور`} />
        <Stat label="سود امروز" value={d.day.profit} icon={TrendingUp} tone="green" />
        <Stat label="دریافت نقد" value={d.day.cash} icon={Banknote} tone="amber" />
        <Stat label="دریافت چک" value={d.day.checks} icon={Landmark} tone="violet" />
      </div>

      <h2 className="section-title">این ماه</h2>
      <div className="stats">
        <Stat label="فروش ماه" value={d.month.total} icon={FileText} sub={`${faDigits(d.month.count)} فاکتور`} />
        <Stat label="سود ماه" value={d.month.profit} icon={TrendingUp} tone="green" />
        <Stat label="مانده طلب ماه" value={d.month.remaining} icon={Wallet} tone="red" />
        <Stat label="چک‌های در جریان" value={d.pendingChecksTotal} icon={Landmark} tone="violet" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3><AlertTriangle size={18} /> چک‌های نزدیک سررسید</h3>
            <button className="link" onClick={() => go('checks')}>همه چک‌ها</button>
          </div>
          {d.upcomingChecks.length === 0 ? (
            <Empty text="چکی در هفت روز آینده سررسید نمی‌شود" />
          ) : (
            <ul className="list">
              {d.upcomingChecks.map((c) => (
                <li key={c.id}>
                  <div>
                    <b>{c.customer_name || 'بدون نام'}</b>
                    <small className="muted"> · چک {faDigits(c.check_number)} {c.bank}</small>
                    <div className="muted small">{prettyDate(c.due_date)}</div>
                  </div>
                  <div className="end">
                    <b>{fmt(c.amount)}</b>
                    <span className={`badge ${c.days_left < 0 ? 'red' : c.days_left <= 2 ? 'amber' : 'blue'}`}>
                      {c.days_left < 0 ? `${faDigits(-c.days_left)} روز گذشته` : c.days_left === 0 ? 'امروز' : `${faDigits(c.days_left)} روز مانده`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3><FileText size={18} /> آخرین فاکتورها</h3>
            <button className="link" onClick={() => go('invoices')}>همه فاکتورها</button>
          </div>
          {d.recent.length === 0 ? (
            <Empty text="هنوز فاکتوری ثبت نشده" action={<button className="btn primary sm" onClick={() => go('invoices', 'new')}>ثبت اولین فاکتور</button>} />
          ) : (
            <ul className="list">
              {d.recent.map((i) => (
                <li key={i.id} className="clickable" onClick={() => go('invoices', { open: i.id })}>
                  <div>
                    <b>فاکتور {faDigits(i.number)}</b>
                    <small className="muted"> · {i.customer_name || 'بدون مشتری'}</small>
                    <div className="muted small">{prettyDate(i.date)}</div>
                  </div>
                  <div className="end">
                    <b>{fmt(i.total)}</b>
                    <span className="green small">سود {fmt(i.profit)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
