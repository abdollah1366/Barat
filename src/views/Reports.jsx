import React, { useEffect, useState } from 'react'
import { FileSpreadsheet, TrendingUp, FileText, Banknote, Landmark, Wallet, Receipt } from 'lucide-react'
import { api, fmt, faDigits, prettyDate, todayJ, monthStart, shiftDays } from '../lib/util.js'
import { PageHead, DateInput, Stat, Empty, useToast } from '../components/ui.jsx'

export default function Reports() {
  const toast = useToast()
  const [range, setRange] = useState({ from: monthStart(), to: todayJ() })
  const [data, setData] = useState(null)

  useEffect(() => {
    Promise.all([
      api('reports.summary', range.from, range.to),
      api('reports.byDay', range.from, range.to),
      api('reports.byProduct', range.from, range.to)
    ]).then(([summary, days, products]) => setData({ summary, days, products }))
  }, [range])

  async function exportXlsx() {
    try { if (await api('app.exportExcel', range.from, range.to)) toast('فایل اکسل ساخته شد') } catch (e) { toast(e.message, 'err') }
  }

  const presets = [
    ['امروز', todayJ(), todayJ()],
    ['۷ روز اخیر', shiftDays(todayJ(), -6), todayJ()],
    ['این ماه', monthStart(), todayJ()],
    ['امسال', todayJ().slice(0, 5) + '01/01', todayJ()]
  ]
  const maxDay = Math.max(1, ...(data?.days || []).map((d) => d.total))

  return (
    <div className="page">
      <PageHead title="گزارش‌ها" sub="خلاصه فروش، سود و دریافتی‌ها">
        <button className="btn primary" onClick={exportXlsx}><FileSpreadsheet size={18} /> خروجی اکسل (صورت حساب)</button>
      </PageHead>

      <div className="toolbar card">
        <span className="muted">از</span>
        <DateInput value={range.from} onChange={(v) => setRange({ ...range, from: v })} />
        <span className="muted">تا</span>
        <DateInput value={range.to} onChange={(v) => setRange({ ...range, to: v })} />
        {presets.map(([l, f, t]) => <button key={l} className="btn ghost sm" onClick={() => setRange({ from: f, to: t })}>{l}</button>)}
      </div>

      {data && (<>
        <div className="stats">
          <Stat label="جمع فروش" value={data.summary.total} icon={FileText} sub={`${faDigits(data.summary.count)} فاکتور · ${fmt(data.summary.qty)} متر`} />
          <Stat label="سود خالص" value={data.summary.profit} icon={TrendingUp} tone="green" />
          <Stat label="هزینه‌ها" value={data.summary.cost} icon={Receipt} tone="red" />
          <Stat label="مانده طلب" value={data.summary.remaining} icon={Wallet} tone="red" />
          <Stat label="دریافت نقد" value={data.summary.cash} icon={Banknote} tone="amber" />
          <Stat label="دریافت چک" value={data.summary.checks} icon={Landmark} tone="violet" />
          <Stat label="جمع دریافتی (نقد + چک)" value={data.summary.cash + data.summary.checks} icon={Wallet} tone="primary" />
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-head"><h3>فروش روزانه</h3></div>
            {data.days.length === 0 ? <Empty text="داده‌ای نیست" /> : (
              <div className="bars">
                {data.days.map((d) => (
                  <div key={d.date} className="bar-row" title={`سود: ${fmt(d.profit)}`}>
                    <span className="bar-label">{prettyDate(d.date)}</span>
                    <div className="bar-track"><div className="bar" style={{ width: `${(d.total / maxDay) * 100}%` }} /></div>
                    <span className="bar-value">{fmt(d.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card no-pad">
            <div className="card-head pad"><h3>فروش بر اساس کالا</h3></div>
            {data.products.length === 0 ? <Empty text="داده‌ای نیست" /> : (
              <table className="table">
                <thead><tr><th>کالا</th><th>متراژ</th><th>فروش</th><th>سود</th></tr></thead>
                <tbody>
                  {data.products.map((p) => (
                    <tr key={p.name}><td>{p.name}</td><td className="num-cell">{fmt(p.qty)}</td><td className="num-cell">{fmt(p.total)}</td><td className="num-cell green">{fmt(p.profit)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </>)}
    </div>
  )
}
