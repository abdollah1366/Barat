import React, { useEffect, useState } from 'react'
import { DatabaseBackup, Upload, Info } from 'lucide-react'
import { api, faDigits } from '../lib/util.js'
import { PageHead, useToast, Confirm } from '../components/ui.jsx'

export default function Settings() {
  const toast = useToast()
  const [info, setInfo] = useState(null)
  const [ask, setAsk] = useState(false)
  useEffect(() => { api('app.info').then(setInfo) }, [])

  async function backup() {
    try { const f = await api('app.backup'); if (f) toast('نسخه پشتیبان ذخیره شد') } catch (e) { toast(e.message, 'err') }
  }
  async function restore() {
    setAsk(false)
    try { const f = await api('app.restore'); if (f) { toast('اطلاعات بازگردانی شد'); setTimeout(() => location.reload(), 800) } } catch (e) { toast(e.message, 'err') }
  }

  return (
    <div className="page">
      <PageHead title="تنظیمات" />
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3><DatabaseBackup size={18} /> پشتیبان‌گیری</h3></div>
          <p className="muted">همه اطلاعات در یک فایل ذخیره می‌شود. پیشنهاد می‌کنیم هر هفته یک نسخه پشتیبان روی فلش یا فضای ابری بگیرید.</p>
          <div className="actions">
            <button className="btn primary" onClick={backup}><DatabaseBackup size={17} /> گرفتن نسخه پشتیبان</button>
            <button className="btn ghost" onClick={() => setAsk(true)}><Upload size={17} /> بازگردانی</button>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3><Info size={18} /> درباره برنامه</h3></div>
          {info && (<>
            <p>حسابداری برات · نسخه {faDigits(info.version)}</p>
            <p className="muted small ltr">{info.dbPath}</p>
          </>)}
        </div>
      </div>
      {ask && <Confirm text="با بازگردانی، اطلاعات فعلی با فایل پشتیبان جایگزین می‌شود (یک نسخه از اطلاعات فعلی کنار فایل اصلی نگه داشته می‌شود). ادامه می‌دهید؟" yesLabel="بله، بازگردانی شود" onYes={restore} onNo={() => setAsk(false)} />}
    </div>
  )
}
