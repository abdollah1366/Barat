import * as jalaali from 'jalaali-js'

export const api = (method, ...args) => window.api.call(method, ...args)

const FA = '۰۱۲۳۴۵۶۷۸۹'
const AR = '٠١٢٣٤٥٦٧٨٩'
// تبدیل ارقام فارسی/عربی به انگلیسی
export function toEn(s) {
  return String(s ?? '')
    .replace(/[۰-۹]/g, (d) => FA.indexOf(d))
    .replace(/[٠-٩]/g, (d) => AR.indexOf(d))
}
export function parseNum(s) {
  const v = parseFloat(toEn(s).replace(/[,٬\s]/g, '').replace('٫', '.'))
  return Number.isFinite(v) ? v : 0
}
const nf = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 })
export const fmt = (n) => nf.format(Math.round((+n || 0) * 100) / 100)
export const faDigits = (s) => String(s ?? '').replace(/\d/g, (d) => FA[d])

const pad = (n) => String(n).padStart(2, '0')
export function todayJ() {
  const d = new Date()
  const j = jalaali.toJalaali(d)
  return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`
}
// ورودی مثل 1404/8/3 یا ۱۴۰۴-۰۸-۰۳ را استاندارد می‌کند
export function normDate(s) {
  const parts = toEn(s).trim().split(/[\/\-.\s]+/).map(Number)
  if (parts.length !== 3) return null
  let [y, m, d] = parts
  if (y < 100) y += 1400
  if (!jalaali.isValidJalaaliDate(y, m, d)) return null
  return `${y}/${pad(m)}/${pad(d)}`
}
export function monthStart(j = todayJ()) {
  return j.slice(0, 8) + '01'
}
export function shiftDays(j, days) {
  const [y, m, d] = j.split('/').map(Number)
  const g = jalaali.toGregorian(y, m, d)
  const dt = new Date(g.gy, g.gm - 1, g.gd + days)
  const r = jalaali.toJalaali(dt)
  return `${r.jy}/${pad(r.jm)}/${pad(r.jd)}`
}
export const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
export function prettyDate(j) {
  if (!j) return ''
  const [y, m, d] = j.split('/').map(Number)
  return `${faDigits(d)} ${MONTHS[m - 1]} ${faDigits(y)}`
}

export const lineTotal = (it) => parseNum(it.qty) * parseNum(it.sell_price)
export const lineProfit = (it) => (parseNum(it.sell_price) - parseNum(it.buy_price)) * parseNum(it.qty) - parseNum(it.cost)
