/** The test hook the game puts on `window` (src/app/main.ts). */
interface Window {
  micDropTargets?: () => { name: string; x: number; y: number; enabled: boolean }[];
}
