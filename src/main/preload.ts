// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const electronHandler = {
  store: {
    get(key) {
      return ipcRenderer.sendSync('electron-store-get', key);
    },
    set(property, val) {
      ipcRenderer.send('electron-store-set', property, val);
    }
  }
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
