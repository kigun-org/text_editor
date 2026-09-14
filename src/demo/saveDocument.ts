function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Mock Unpoly `up.request` so TextEditor autosave borders work in the demo. */
export function installMockUnpoly() {
  class MockResponse extends Error {
    status: number;
    text: string;

    constructor(status: number, text: string) {
      super(text);
      this.status = status;
      this.text = text;
    }
  }

  globalThis.up = {
    Response: MockResponse,
    request: async () => {
      await delay(300 + Math.random() * 500);
      if (Math.random() < 0.15) {
        throw new MockResponse(500, "Mock server rejected the save");
      }
    },
  };
}
