export type MockEmailRecord = {
  id: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  createdAt: string;
};

const globalForEmail = globalThis as typeof globalThis & {
  __reelforgeMockEmails?: MockEmailRecord[];
};

function getStore() {
  if (!globalForEmail.__reelforgeMockEmails) {
    globalForEmail.__reelforgeMockEmails = [];
  }

  return globalForEmail.__reelforgeMockEmails;
}

export function pushMockEmail(email: MockEmailRecord) {
  getStore().push(email);
}

export function listMockEmails() {
  return [...getStore()];
}

export function clearMockEmails() {
  globalForEmail.__reelforgeMockEmails = [];
}
