// Polyfills for jsdom — required by Shopify Polaris

// window.matchMedia is used by Polaris MediaQueryProvider
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// IntersectionObserver stub
class IntersectionObserverStub {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = IntersectionObserverStub;

// ResizeObserver stub
class ResizeObserverStub {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub;
