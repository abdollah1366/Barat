const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  call: async (method, ...args) => {
    const res = await ipcRenderer.invoke('api', method, args)
    if (res && res.error) throw new Error(res.error)
    return res.data
  }
})
