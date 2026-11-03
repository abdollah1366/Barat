import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertCircle, CalendarDays } from 'lucide-react'
import { fmt, parseNum, normDate, todayJ, toEn } from '../lib/util.js'

// ---------- پیام‌های کوتاه (Toast) ----------
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((text, type = 'ok') => {
    const id = Math.random()
    setItems((s) => [...s, { id, text, type }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// ---------- پنجره ----------
export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} title="بستن"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Confirm({ text, onYes, onNo, yesLabel = 'بله، حذف شود' }) {
  return (
    <Modal title="تأیید" onClose={onNo}
      footer={<>
        <button className="btn danger" onClick={onYes}>{yesLabel}</button>
        <button className="btn ghost" onClick={onNo}>انصراف</button>
      </>}>
      <p>{text}</p>
    </Modal>
  )
}

// ---------- ورودی عدد با جداکننده هزارگان ----------
export function NumberInput({ value, onChange, className = '', ...rest }) {
  const [text, setText] = useState(value ? fmtEn(value) : '')
  const [focus, setFocus] = useState(false)
  useEffect(() => { if (!focus) setText(value ? fmtEn(value) : '') }, [value, focus])
  return (
    <input
      {...rest}
      className={`num ${className}`}
      inputMode="decimal"
      value={text}
      onFocus={(e) => { setFocus(true); e.target.select() }}
      onBlur={() => setFocus(false)}
      onChange={(e) => {
        const raw = toEn(e.target.value).replace(/[^\d.,]/g, '')
        setText(raw)
        onChange(parseNum(raw))
      }}
    />
  )
}
const fmtEn = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)

// ---------- ورودی تاریخ شمسی ----------
export function DateInput({ value, onChange, placeholder = '۱۴۰۴/۰۱/۰۱' }) {
  const [text, setText] = useState(value || '')
  useEffect(() => setText(value || ''), [value])
  const bad = text && !normDate(text)
  return (
    <div className={`date-input ${bad ? 'bad' : ''}`}>
      <input
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value)
          const n = normDate(e.target.value)
          if (n) onChange(n)
          else if (!e.target.value) onChange('')
        }}
        onBlur={() => { const n = normDate(text); if (n) setText(n) }}
      />
      <button type="button" className="icon-btn" title="امروز" onClick={() => onChange(todayJ())}>
        <CalendarDays size={16} />
      </button>
    </div>
  )
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Stat({ label, value, icon: Icon, tone = 'primary', sub }) {
  return (
    <div className={`stat tone-${tone}`}>
      <div className="stat-icon">{Icon && <Icon size={22} />}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{fmt(value)}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

export function Empty({ icon: Icon, text, action }) {
  return (
    <div className="empty">
      {Icon && <Icon size={42} strokeWidth={1.4} />}
      <p>{text}</p>
      {action}
    </div>
  )
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      <div className="actions">{children}</div>
    </div>
  )
}
