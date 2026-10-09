import { test as coverageTest, expect } from 'playwright-test-coverage';

interface ServiceRequest {
  method: string;
  url: string;
  body: string | null;
}

const test = coverageTest.extend({
  page: async ({ page }, use) => {
    const violations: ServiceRequest[] = [];
    const serviceOrigins = new Set(['http://localhost:3000', 'https://pizza-factory.cs329.click']);

    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();

      if (serviceOrigins.has(new URL(url).origin)) {
        violations.push({ method: request.method(), url, body: request.postData() });
        await route.abort();
        return;
      }

      await route.continue();
    });

    await use(page);
    expect(violations, 'Unexpected request(s) made to a JWT Pizza service').toEqual([]);
  },
});

export { test, expect };
