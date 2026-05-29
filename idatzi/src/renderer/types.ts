export {};

declare global {
  interface Window {
    idatzi: import('../preload/index').IdatziAPI;
  }
}
