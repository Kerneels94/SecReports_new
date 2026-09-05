import "@testing-library/jest-dom";

class ResizeObserverMock {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    const width = (target as HTMLElement).offsetWidth || 600;
    const height = (target as HTMLElement).offsetHeight || 300;
    this.callback([{ target, contentRect: { width, height } } as ResizeObserverEntry], this);
  }
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(global, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});
