import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react'
import { api, fmt, faDigits } from '../lib/util.js'
import { PageHead, Modal, Field, Empty, Confirm, useToast } from '../components/ui.jsx'

export default function Customers() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [q, setQ] = useState('')
  const load = () => api('customers.list').then(setRows)
  useEffect(() => { load() }, [])

  async function save() {
    try { await api('customers.save', edit); toast('ذخیره شد'); setEdit(null); load() } catch (e) { toast(e.message, 'err') }
  }
  async function remove() { await api('customers.remove', del.id); setDel(null); toast('حذف شد'); load() }

  const shown = rows.filter((r) => !q || r.name.includes(q) || (r.phone || '').includes(q))

  return (
    <div className="page">
      <PageHead title="مشتری‌ها" sub="لیست مشتری‌ها و مانده حساب هر کدام">
        <button className="btn primary" onClick={() => setEdit({ name: '', phone: '', note: '' })}><Plus size={18} /> مشتری جدید</button>
      </PageHead>
      <div className="toolbar card">
        <div className="search"><Search size={17} /><input placeholder="جستجوی نام یا تلفن" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="card no-pad">
        {shown.length === 0 ? <Empty icon={Users} text="مشتری‌ای ثبت نشده" /> : (
          <table className="table">
            <thead><tr><th>نام</th><th>تلفن</th><th>جمع خرید</th><th>پرداختی</th><th>مانده</th><th>توضیحات</th><th></th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name}</b></td>
                  <td>{faDigits(r.phone)}</td>
                  <td className="num-cell">{fmt(r.total)}</td>
                  <td className="num-cell">{fmt(r.paid)}</td>
                  <td className="num-cell">{r.total - r.paid > 0.5 ? <span className="badge red">{fmt(r.total - r.paid)}</span> : <span className="badge green">تسویه</span>}</td>
                  <td className="muted">{r.note}</td>
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
        <Modal title={edit.id ? 'ویرایش مشتری' : 'مشتری جدید'} onClose={() => setEdit(null)}
          footer={<><button className="btn primary" onClick={save}>ذخیره</button><button className="btn ghost" onClick={() => setEdit(null)}>انصراف</button></>}>
          <div className="form-col">
            <Field label="نام"><input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} /></Field>
            <Field label="تلفن"><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="توضیحات"><textarea rows={3} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
      {del && <Confirm text={`«${del.name}» حذف شود؟ فاکتورهای این مشتری باقی می‌مانند.`} onYes={remove} onNo={() => setDel(null)} />}
    </div>
  )
}
