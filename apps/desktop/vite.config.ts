import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the same dist/ works for Electron AND Capacitor
  // (Android loads from file:// via android_asset, which doesn't honor absolute paths).
  base: "./"
});
