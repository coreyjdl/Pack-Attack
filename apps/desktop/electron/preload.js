import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("packAttack", {
  appVersion: "0.1.0"
});
