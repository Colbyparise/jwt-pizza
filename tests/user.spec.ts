import { test, expect } from './testSetup';
import type { Page } from '@playwright/test';

const diner = {
  id: 'diner-1',
  name: 'Pizza Diner',
  email: 'diner@example.com',
  roles: [{ role: 'diner' }],
};

const pizza = {
  id: 'pizza-1',
  title: 'Margherita',
  description: 'Tomato, mozzarella, basil',
  image: '/pizza1.png',
  price: 12,
};

async function mockApi(page: Page, options: { loggedIn?: boolean; withOrders?: boolean; role?: string } = {}) {
  const currentUser = { ...diner, roles: [{ role: options.role || 'diner' }] };
  await page.addInitScript(() => {
    (window as any).HSStaticMethods = { autoInit: () => {} };
    window.scrollTo = () => {};
  });
  if (options.loggedIn) await page.addInitScript(() => localStorage.setItem('token', 'test-token'));

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body;

    if (path === '/api/auth' && request.method() === 'POST') {
      expect(request.postDataJSON()).toMatchObject({ name: expect.any(String), email: expect.any(String), password: expect.any(String) });
      body = { user: currentUser, token: 'test-token' };
    } else if (path === '/api/auth' && request.method() === 'PUT') {
      expect(request.postDataJSON()).toMatchObject({ email: expect.any(String), password: expect.any(String) });
      body = { user: currentUser, token: 'test-token' };
    } else if (path === '/api/auth' && request.method() === 'DELETE') {
      body = {};
    } else if (path === '/api/user/me' && request.method() === 'GET') {
      body = currentUser;
    } else if (path === '/api/order/menu' && request.method() === 'GET') {
      body = [pizza];
    } else if (path === '/api/franchise' && request.method() === 'GET') {
      body = {
        franchises: [
          {
            id: 'franchise-1',
            name: 'Provo Pizza',
            admins: [{ id: 'diner-1', email: 'diner@example.com', name: 'Pizza Diner' }],
            stores: [{ id: 'store-1', name: 'Downtown', totalRevenue: 120 }],
          },
        ],
        more: false,
      };
    } else if (path === '/api/franchise/franchise-1/store' && request.method() === 'POST') {
      expect(request.postDataJSON()).toMatchObject({ name: expect.any(String) });
      body = { id: 'store-2', name: 'Campus' };
    } else if (path === '/api/franchise' && request.method() === 'POST') {
      expect(request.postDataJSON()).toMatchObject({ name: expect.any(String), admins: [{ email: expect.any(String) }] });
      body = { id: 'franchise-2', name: 'New Franchise', stores: [] };
    } else if (path.startsWith('/api/franchise/') && request.method() === 'DELETE') {
      body = {};
    } else if (path === '/api/franchise/diner-1' && request.method() === 'GET') {
      body = [{ id: 'franchise-1', name: 'Provo Pizza', stores: [{ id: 'store-1', name: 'Downtown', totalRevenue: 120 }] }];
    } else if (path === '/api/order' && request.method() === 'GET') {
      body = {
        id: diner.id,
        dinerId: diner.id,
        orders: options.withOrders
          ? [{ id: 'order-previous', franchiseId: 'franchise-1', storeId: 'store-1', date: '2026-10-01', items: [pizza] }]
          : [],
      };
    } else if (path === '/api/order' && request.method() === 'POST') {
      expect(request.postDataJSON()).toMatchObject({
        franchiseId: 'franchise-1',
        storeId: 'store-1',
        items: [{ menuId: pizza.id, description: pizza.title, price: pizza.price }],
      });
      body = {
        order: { id: 'order-1', franchiseId: 'franchise-1', storeId: 'store-1', date: '2026-10-08T12:00:00.000Z', items: [pizza] },
        jwt: 'signed-test-order',
      };
    } else if (path === '/api/docs' && request.method() === 'GET') {
      body = {
        endpoints: [
          { requiresAuth: false, method: 'GET', path: '/api/order/menu', description: 'List pizzas', example: '{}', response: [pizza] },
        ],
      };
    } else if (path.endsWith('/api/order/verify') && request.method() === 'POST') {
      expect(request.postDataJSON()).toMatchObject({ jwt: 'signed-test-order' });
      body = { message: 'valid', payload: 'signed order verified' };
    } else {
      throw new Error(`Unexpected mocked API request: ${request.method()} ${request.url()}`);
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

test('register, place an order, verify its JWT, and log out', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page).toHaveTitle('JWT Pizza');
  await expect(page.getByRole('heading', { name: "The web's best pizza" })).toBeVisible();

  await page.getByRole('link', { name: 'Register' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to the party' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Full name' }).fill('Pizza Diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill('diner@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('secret');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText('Pizza Diner');
  await expect(page.getByRole('main')).toContainText('How have you lived this long');

  await page.getByRole('link', { name: 'Order' }).click();
  await expect(page.getByRole('heading', { name: 'Awesome is a click away' })).toBeVisible();
  await page.getByRole('combobox').selectOption('store-1');
  await page.getByRole('button', { name: /Margherita/ }).click();
  await expect(page.getByText('Selected pizzas: 1')).toBeVisible();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await expect(page.getByRole('heading', { name: 'So worth it' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Margherita');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('heading', { name: 'Here is your JWT Pizza!' })).toBeVisible();
  await expect(page.getByText('signed-test-order')).toBeVisible();
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByRole('heading', { name: /JWT Pizza - valid/ })).toBeVisible();
  await expect(page.getByText('signed order verified')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.goto('/logout');
  await expect(page.getByRole('heading', { name: "The web's best pizza" })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
});

test('diner dashboard displays previous order history', async ({ page }) => {
  await mockApi(page, { loggedIn: true, withOrders: true });
  await page.goto('/diner-dashboard');

  await expect(page.getByRole('heading', { name: 'Your pizza kitchen' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('order-previous');
  await expect(page.getByRole('table')).toContainText('12');
});

test('public pages navigate through footer links and API documentation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('heading', { name: 'The secret sauce' })).toBeVisible();

  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'Mama Rucci, my my' })).toBeVisible();

  await page.getByRole('contentinfo').getByRole('link', { name: 'Franchise' }).click();
  await expect(page.getByRole('heading', { name: 'So you want a piece of the pie?' })).toBeVisible();
  await expect(page.getByRole('link', { name: '800-555-5555' })).toHaveAttribute('href', 'tel:800-555-5555');

  await page.goto('/docs');
  await expect(page.getByRole('heading', { name: 'JWT Pizza API' })).toBeVisible();
  await expect(page.getByText('/api/order/menu')).toBeVisible();

  await page.goto('/this-page-does-not-exist');
  await expect(page.getByRole('heading', { name: /not found|oops/i })).toBeVisible();
});

test('admin can create and close franchises and stores', async ({ page }) => {
  await mockApi(page, { loggedIn: true, role: 'admin' });
  await page.goto('/admin-dashboard');
  await expect(page.getByRole('heading', { name: "Mama Ricci's kitchen" })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Provo Pizza');
  await expect(page.getByRole('table')).toContainText('Downtown');

  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByPlaceholder('franchise name').fill('New Franchise');
  await page.getByPlaceholder('franchisee admin email').fill('owner@example.com');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: "Mama Ricci's kitchen" })).toBeVisible();

  await page.getByRole('row', { name: /Downtown/ }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText(/Provo Pizza store Downtown/)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('row', { name: /Provo Pizza/ }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText(/Provo Pizza franchise/)).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { name: "Mama Ricci's kitchen" })).toBeVisible();
});

test('franchisee can manage stores', async ({ page }) => {
  await mockApi(page, { loggedIn: true, role: 'franchisee' });
  await page.goto('/franchise-dashboard');
  await expect(page.getByRole('heading', { name: 'Provo Pizza' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Downtown');

  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByPlaceholder('store name').fill('Campus');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: 'Provo Pizza' })).toBeVisible();

  await page.getByRole('row', { name: /Downtown/ }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText(/Provo Pizza store Downtown/)).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { name: 'Provo Pizza' })).toBeVisible();
});

test('checkout without an account carries the order into the login route', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Order now' }).click();
  await page.getByRole('combobox').selectOption('store-1');
  await page.getByRole('button', { name: /Margherita/ }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await expect(page).toHaveURL(/\/payment\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Email address' }).fill('diner@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('secret');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'So worth it' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Margherita');

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'Awesome is a click away' })).toBeVisible();
});

test('home page has the expected title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('JWT Pizza');
});

test('diner can open the profile editor', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill('diner@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();
  await expect(page.getByRole('main')).toContainText(/pizza diner/i);
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible();
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.locator('[role="dialog"]')).toHaveClass(/hidden/);
});
