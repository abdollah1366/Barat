import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react'
import { api, fmt } from '../lib/util.js'
import { PageHead, Modal, Field, Empty, Confirm, NumberInput, useToast } from '../components/ui.jsx'

export default function Products() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [q, setQ] = useState('')
  const load = () => api('products.list').then(setRows)
  useEffect(() => { load() }, [])

  async function save() {
    try { await api('products.save', edit); toast('ذخیره شد'); setEdit(null); load() } catch (e) { toast(e.message, 'err') }
  }
  async function remove() { await api('products.remove', del.id); setDel(null); toast('حذف شد'); load() }
  const shown = rows.filter((r) => !q || r.name.includes(q))

  return (
    <div className="page">
      <PageHead title="کالاها" sub="قیمت پیش‌فرض خرید و فروش؛ هنگام ثبت فاکتور خودکار پر می‌شود">
        <button className="btn primary" onClick={() => setEdit({ name: '', unit: 'متر', buy_price: 0, sell_price: 0 })}><Plus size={18} /> کالای جدید</button>
      </PageHead>
      <div className="toolbar card">
        <div className="search"><Search size={17} /><input placeholder="جستجوی کالا" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="card no-pad">
        {shown.length === 0 ? <Empty icon={Package} text="کالایی ثبت نشده" /> : (
          <table className="table">
            <thead><tr><th>نام کالا</th><th>واحد</th><th>قیمت خرید</th><th>قیمت فروش</th><th>سود هر واحد</th><th></th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name}</b></td>
                  <td>{r.unit}</td>
                  <td className="num-cell">{fmt(r.buy_price)}</td>
                  <td className="num-cell">{fmt(r.sell_price)}</td>
                  <td className="num-cell green">{fmt(r.sell_price - r.buy_price)}</td>
                  <td className="row-actions">
                    <button className="icon-btn" onClick={() => setEdit(r)}><Pencil size={16} /></button>
                    <button className="icon-btn danger" onClick={() => setDel(r)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {edit && (
        <Modal title={edit.id ? 'ویرایش کالا' : 'کالای جدید'} onClose={() => setEdit(null)}
          footer={<><button className="btn primary" onClick={save}>ذخیره</button><button className="btn ghost" onClick={() => setEdit(null)}>انصراف</button></>}>
          <div className="form-col">
            <Field label="نام کالا"><input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="واحد"><input value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></Field>
            <div className="form-row">
              <Field label="قیمت خرید" className="grow"><NumberInput value={edit.buy_price} onChange={(v) => setEdit({ ...edit, buy_price: v })} /></Field>
              <Field label="قیمت فروش" className="grow"><NumberInput value={edit.sell_price} onChange={(v) => setEdit({ ...edit, sell_price: v })} /></Field>
            </div>
          </div>
        </Modal>
      )}
      {del && <Confirm text={`کالای «${del.name}» حذف شود؟ فاکتورهای قبلی تغییری نمی‌کنند.`} onYes={remove} onNo={() => setDel(null)} />}
    </div>
  )
}
