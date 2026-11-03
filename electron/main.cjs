const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const db = require('./db.cjs')
const { exportExcel } = require('./excel.cjs')

const isDev = process.argv.includes('--dev')
let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 640,
    title: 'حسابداری برات',
    backgroundColor: '#f5f7fb',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  Menu.setApplicationMenu(null)
  win.once('ready-to-show', () => win.show())
  if (isDev) {
    win.loadURL('http://127.0.0.1:5173')
    win.webContents.on('before-input-event', (_, input) => {
      if (input.key === 'F12') win.webContents.toggleDevTools()
    })
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

// نقشه متدهایی که رابط کاربری می‌تواند صدا بزند
const methods = {
  'customers.list': db.customers.list,
  'customers.save': db.customers.save,
  'customers.remove': db.customers.remove,
  'products.list': db.products.list,
  'products.save': db.products.save,
  'products.remove': db.products.remove,
  'invoices.list': db.invoices.list,
  'invoices.get': db.invoices.get,
  'invoices.save': db.invoices.save,
  'invoices.remove': db.invoices.remove,
  'invoices.nextNumber': db.invoices.nextNumber,
  'checks.list': db.checks.list,
  'checks.setStatus': db.checks.setStatus,
  'reports.summary': db.reports.summary,
  'reports.byDay': db.reports.byDay,
  'reports.byProduct': db.reports.byProduct,
  'reports.lines': db.reports.lines,
  dashboard: db.dashboard,
  today: db.today,
  'app.info': () => ({ version: app.getVersion(), dbPath: db.path }),

  'app.backup': async () => {
    db.saveNow()
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'ذخیره نسخه پشتیبان',
      defaultPath: `barat-backup-${db.today().replace(/\//g, '-')}.db`,
      filters: [{ name: 'Barat Backup', extensions: ['db'] }]
    })
    if (canceled || !filePath) return null
    fs.copyFileSync(db.path, filePath)
    return filePath
  },
  'app.restore': async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'بازگردانی نسخه پشتیبان',
      filters: [{ name: 'Barat Backup', extensions: ['db'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths[0]) return null
    db.saveNow()
    fs.copyFileSync(db.path, db.path + '.before-restore')
    fs.copyFileSync(filePaths[0], db.path)
    await db.open(db.path)
    return filePaths[0]
  },
  'app.exportExcel': async (from, to) => {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'خروجی اکسل',
      defaultPath: `surat-hesab-${(from || 'all').replace(/\//g, '-')}${to && to !== from ? '_' + to.replace(/\//g, '-') : ''}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    if (canceled || !filePath) return null
    await exportExcel(filePath, from, to, db)
    shell.showItemInFolder(filePath)
    return filePath
  },
  'app.print': () => { win.webContents.print({ silent: false, printBackground: true }); return true }
}

ipcMain.handle('api', async (_, method, args) => {
  const fn = methods[method]
  if (!fn) return { error: `متد ناشناخته: ${method}` }
  try {
    return { data: await fn(...(args || [])) }
  } catch (e) {
    return { error: e.message || String(e) }
  }
})

app.whenReady().then(async () => {
  const dir = app.getPath('userData')
  fs.mkdirSync(dir, { recursive: true })
  await db.open(path.join(dir, 'barat.db'))
  createWindow()
})

app.on('before-quit', () => db.saveNow())
app.on('window-all-closed', () => app.quit())
