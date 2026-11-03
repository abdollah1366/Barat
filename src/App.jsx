import React, { useEffect, useState } from 'react'
import { LayoutDashboard, FileText, Users, Package, Landmark, BarChart3, Settings as Cog, Moon, Sun, Calculator } from 'lucide-react'
import { ToastProvider } from './components/ui.jsx'
import { prettyDate, todayJ } from './lib/util.js'
import Dashboard from './views/Dashboard.jsx'
import Invoices from './views/Invoices.jsx'
import Customers from './views/Customers.jsx'
import Products from './views/Products.jsx'
import Checks from './views/Checks.jsx'
import Reports from './views/Reports.jsx'
import Settings from './views/Settings.jsx'

const NAV = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, el: Dashboard },
  { id: 'invoices', label: 'فاکتورها', icon: FileText, el: Invoices },
  { id: 'checks', label: 'چک‌ها', icon: Landmark, el: Checks },
  { id: 'customers', label: 'مشتری‌ها', icon: Users, el: Customers },
  { id: 'products', label: 'کالاها', icon: Package, el: Products },
  { id: 'reports', label: 'گزارش‌ها', icon: BarChart3, el: Reports },
  { id: 'settings', label: 'تنظیمات', icon: Cog, el: Settings }
]

function readPref(k, d) { try { return localStorage.getItem(k) || d } catch { return d } }
function writePref(k, v) { try { localStorage.setItem(k, v) } catch {} }

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [intent, setIntent] = useState(null) // مثلاً باز کردن فاکتور جدید از داشبورد
  const [theme, setTheme] = useState(() => readPref('theme', 'light'))
  useEffect(() => { document.documentElement.dataset.theme = theme; writePref('theme', theme) }, [theme])

  const go = (p, i = null) => { setIntent(i); setPage(p) }
  const Current = NAV.find((n) => n.id === page).el

  return (
    <ToastProvider>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="logo"><Calculator size={22} /></div>
            <div>
              <b>حسابداری برات</b>
              <small>{prettyDate(todayJ())}</small>
            </div>
          </div>
          <nav>
            {NAV.map((n) => (
              <button key={n.id} className={page === n.id ? 'active' : ''} onClick={() => go(n.id)}>
                <n.icon size={19} /> <span>{n.label}</span>
              </button>
            ))}
          </nav>
          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            <span>{theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}</span>
          </button>
        </aside>
        <main className="content">
          <Current go={go} intent={intent} clearIntent={() => setIntent(null)} />
        </main>
      </div>
    </ToastProvider>
  )
}
