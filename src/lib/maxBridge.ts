type MaxBridge = {
  miniapp?: {
    ready?: () => void;
    expand?: () => void;
    setHeaderColor?: (color: string) => void;
  };
};

declare global {
  interface Window {
    MaxBridge?: MaxBridge;
  }
}

export function initMiniAppBridge() {
  window.MaxBridge?.miniapp?.ready?.();
  window.MaxBridge?.miniapp?.expand?.();
  window.MaxBridge?.miniapp?.setHeaderColor?.('#101828');
}
