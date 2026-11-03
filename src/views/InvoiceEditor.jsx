import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Save, Printer, Banknote, Landmark, UserPlus } from 'lucide-react'
import { api, fmt, faDigits, lineTotal, lineProfit, parseNum, todayJ, prettyDate } from '../lib/util.js'
import { Modal, NumberInput, DateInput, Field, useToast } from '../components/ui.jsx'

const emptyItem = () => ({ product_id: null, product_name: '', qty: 0, buy_price: 0, sell_price: 0, cost: 0 })
const emptyPay = (type, amount = 0, date = todayJ()) => ({ type, amount, date, check_number: '', bank: '', due_date: '', status: 'pending' })

export default function InvoiceEditor({ id, onClose, onSaved }) {
  const toast = useToast()
  const [inv, setInv] = useState(null)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [newCustomer, setNewCustomer] = useState(null)

  useEffect(() => {
    api('customers.list').then(setCustomers)
    api('products.list').then(setProducts)
    if (id) api('invoices.get', id).then(setInv)
    else api('invoices.nextNumber').then((n) => setInv({ number: n, date: todayJ(), customer_id: null, note: '', items: [emptyItem()], payments: [] }))
  }, [id])

  const totals = useMemo(() => {
    if (!inv) return {}
    const total = inv.items.reduce((s, x) => s + lineTotal(x), 0)
    const profit = inv.items.reduce((s, x) => s + lineProfit(x), 0)
    const qty = inv.items.reduce((s, x) => s + parseNum(x.qty), 0)
    const cost = inv.items.reduce((s, x) => s + parseNum(x.cost), 0)
    const cash = inv.payments.filter((p) => p.type === 'cash').reduce((s, p) => s + parseNum(p.amount), 0)
    const checks = inv.payments.filter((p) => p.type === 'check' && p.status !== 'bounced').reduce((s, p) => s + parseNum(p.amount), 0)
    return { total, profit, qty, cost, cash, checks, remaining: total - cash - checks }
  }, [inv])

  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  if (!inv) return null

  const set = (patch) => setInv((s) => ({ ...s, ...patch }))
  const setItem = (i, patch) => setInv((s) => ({ ...s, items: s.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) }))
  const setPay = (i, patch) => setInv((s) => ({ ...s, payments: s.payments.map((x, j) => (j === i ? { ...x, ...patch } : x)) }))

  function pickProduct(i, name) {
    const p = products.find((x) => x.name === name)
    if (p) setItem(i, { product_name: name, product_id: p.id, buy_price: p.buy_price, sell_price: p.sell_price })
    else setItem(i, { product_name: name, product_id: null })
  }

  async function save() {
    try {
      const newId = await api('invoices.save', inv)
      toast('فاکتور ذخیره شد')
      onSaved(newId)
    } catch (e) { toast(e.message, 'err') }
  }

  async function addCustomer() {
    try {
      const cid = await api('customers.save', newCustomer)
      setCustomers(await api('customers.list'))
      set({ customer_id: cid })
      setNewCustomer(null)
    } catch (e) { toast(e.message, 'err') }
  }

  const customerName = customers.find((c) => c.id === inv.customer_id)?.name

  return (
    <Modal wide title={id ? `ویرایش فاکتور ${faDigits(inv.number)}` : 'فاکتور جدید'} onClose={onClose}
      footer={<>
        <button className="btn primary" onClick={save}><Save size={17} /> ذخیره <kbd>Ctrl+S</kbd></button>
        <button className="btn ghost" onClick={() => window.print()}><Printer size={17} /> چاپ</button>
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>انصراف</button>
      </>}>

      <div className="form-row">
        <Field label="شماره فاکتور"><NumberInput value={inv.number} onChange={(v) => set({ number: v })} /></Field>
        <Field label="تاریخ"><DateInput value={inv.date} onChange={(v) => set({ date: v })} /></Field>
        <Field label="مشتری" className="grow">
          <div className="input-group">
            <select value={inv.customer_id || ''} onChange={(e) => set({ customer_id: e.target.value ? +e.target.value : null })}>
              <option value="">— بدون مشتری —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="icon-btn" title="مشتری جدید" onClick={() => setNewCustomer({ name: '', phone: '' })}><UserPlus size={17} /></button>
          </div>
        </Field>
        <Field label="توضیحات" className="grow"><input value={inv.note} onChange={(e) => set({ note: e.target.value })} /></Field>
      </div>

      {newCustomer && (
        <div className="inline-box">
          <input autoFocus placeholder="نام مشتری" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
          <input placeholder="تلفن" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
          <button className="btn primary sm" onClick={addCustomer}>افزودن</button>
          <button className="btn ghost sm" onClick={() => setNewCustomer(null)}>انصراف</button>
        </div>
      )}

      <h4 className="block-title">اقلام فاکتور</h4>
      <datalist id="products-list">{products.map((p) => <option key={p.id} value={p.name} />)}</datalist>
      <div className="table-wrap">
        <table className="table edit">
          <thead>
            <tr><th>#</th><th>کالا</th><th>متراژ</th><th>خرید</th><th>فروش متری</th><th>جمع</th><th>هزینه</th><th>سود</th><th></th></tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i}>
                <td className="muted">{faDigits(i + 1)}</td>
                <td><input list="products-list" value={it.product_name} placeholder="نام کالا" onChange={(e) => pickProduct(i, e.target.value)} /></td>
                <td><NumberInput value={it.qty} onChange={(v) => setItem(i, { qty: v })} /></td>
                <td><NumberInput value={it.buy_price} onChange={(v) => setItem(i, { buy_price: v })} /></td>
                <td><NumberInput value={it.sell_price} onChange={(v) => setItem(i, { sell_price: v })} /></td>
                <td className="num-cell">{fmt(lineTotal(it))}</td>
                <td><NumberInput value={it.cost} onChange={(v) => setItem(i, { cost: v })} /></td>
                <td className={`num-cell ${lineProfit(it) < 0 ? 'red' : 'green'}`}>{fmt(lineProfit(it))}</td>
                <td><button className="icon-btn danger" title="حذف ردیف" onClick={() => set({ items: inv.items.filter((_, j) => j !== i) })}><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}><button className="btn ghost sm" onClick={() => set({ items: [...inv.items, emptyItem()] })}><Plus size={15} /> ردیف جدید</button></td>
              <td className="num-cell">{fmt(totals.qty)}</td><td></td><td></td>
              <td className="num-cell"><b>{fmt(totals.total)}</b></td>
              <td className="num-cell">{fmt(totals.cost)}</td>
              <td className="num-cell green"><b>{fmt(totals.profit)}</b></td><td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="pay-head">
        <h4 className="block-title">دریافتی‌ها</h4>
        <div className="actions">
          <button className="btn ghost sm" onClick={() => set({ payments: [...inv.payments, emptyPay('cash', Math.max(0, totals.remaining), inv.date)] })}><Banknote size={15} /> نقد</button>
          <button className="btn ghost sm" onClick={() => set({ payments: [...inv.payments, emptyPay('check', Math.max(0, totals.remaining), inv.date)] })}><Landmark size={15} /> چک</button>
        </div>
      </div>
      {inv.payments.length > 0 && (
        <div className="table-wrap">
          <table className="table edit">
            <thead><tr><th>نوع</th><th>مبلغ</th><th>شماره چک</th><th>بانک</th><th>تاریخ سررسید</th><th>وضعیت</th><th></th></tr></thead>
            <tbody>
              {inv.payments.map((p, i) => (
                <tr key={i}>
                  <td><span className={`badge ${p.type === 'cash' ? 'amber' : 'violet'}`}>{p.type === 'cash' ? 'نقد' : 'چک'}</span></td>
                  <td><NumberInput value={p.amount} onChange={(v) => setPay(i, { amount: v })} /></td>
                  {p.type === 'check' ? (<>
                    <td><input value={p.check_number} onChange={(e) => setPay(i, { check_number: e.target.value })} /></td>
                    <td><input value={p.bank} onChange={(e) => setPay(i, { bank: e.target.value })} /></td>
                    <td><DateInput value={p.due_date} onChange={(v) => setPay(i, { due_date: v })} /></td>
                    <td>
                      <select value={p.status} onChange={(e) => setPay(i, { status: e.target.value })}>
                        <option value="pending">در انتظار</option>
                        <option value="cleared">وصول شد</option>
                        <option value="bounced">برگشتی</option>
                      </select>
                    </td>
                  </>) : <td colSpan={4} className="muted">—</td>}
                  <td><button className="icon-btn danger" onClick={() => set({ payments: inv.payments.filter((_, j) => j !== i) })}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="totals">
        <div><span>جمع فاکتور</span><b>{fmt(totals.total)}</b></div>
        <div><span>نقد</span><b>{fmt(totals.cash)}</b></div>
        <div><span>چک</span><b>{fmt(totals.checks)}</b></div>
        <div className={totals.remaining > 0 ? 'red' : 'green'}><span>مانده</span><b>{fmt(totals.remaining)}</b></div>
        <div className="green"><span>سود</span><b>{fmt(totals.profit)}</b></div>
      </div>

      {/* نسخه چاپی */}
      <div className="print-area">
        <h2>فاکتور فروش شماره {faDigits(inv.number)}</h2>
        <p>تاریخ: {prettyDate(inv.date)} {customerName ? ` — مشتری: ${customerName}` : ''}</p>
        <table>
          <thead><tr><th>ردیف</th><th>کالا</th><th>متراژ</th><th>فی (متری)</th><th>جمع</th></tr></thead>
          <tbody>
            {inv.items.filter((x) => x.product_name).map((it, i) => (
              <tr key={i}><td>{faDigits(i + 1)}</td><td>{it.product_name}</td><td>{fmt(it.qty)}</td><td>{fmt(it.sell_price)}</td><td>{fmt(lineTotal(it))}</td></tr>
            ))}
          </tbody>
        </table>
        <p><b>جمع کل: {fmt(totals.total)}</b> &nbsp; | &nbsp; دریافتی: {fmt(totals.cash + totals.checks)} &nbsp; | &nbsp; مانده: {fmt(totals.remaining)}</p>
        {inv.note && <p>توضیحات: {inv.note}</p>}
      </div>
    </Modal>
  )
}
