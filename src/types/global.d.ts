// Test hook installed by src/debug/debug.ts when the page is opened with #debug.
interface Window {
  __g?: any;
  webkitAudioContext?: typeof AudioContext;
}
