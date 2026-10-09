# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user.spec.ts >> updateUser
- Location: tests\user.spec.ts:3:1

# Error details

```
Test timeout of 5000ms exceeded.
```

```
Error: locator.click: Test timeout of 5000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'pd' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e5]:
    - navigation "Global" [ref=e6]:
      - generic [ref=e7]: JWT Pizza
      - generic [ref=e11]:
        - link "Order" [ref=e12] [cursor=pointer]:
          - /url: /menu
        - link "Franchise" [ref=e13] [cursor=pointer]:
          - /url: /franchise-dashboard
        - link "Login" [ref=e14] [cursor=pointer]:
          - /url: /login
        - link "Register" [ref=e15] [cursor=pointer]:
          - /url: /register
  - list [ref=e16]:
    - listitem [ref=e17]:
      - link "home" [ref=e18] [cursor=pointer]:
        - /url: /
    - listitem [ref=e23]:
      - link "register" [ref=e26] [cursor=pointer]:
        - /url: /register
  - main [ref=e27]:
    - generic [ref=e29]:
      - heading "Welcome to the party" [level=2] [ref=e31]
      - generic [ref=e32]:
        - generic [ref=e33]: "{\"code\":500,\"message\":\"Failed to fetch\"}"
        - generic [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: Email address
            - textbox "Full name" [ref=e39]: pizza diner
          - textbox "Email address" [ref=e41]: user5978@jwt.com
          - generic [ref=e42]:
            - generic [ref=e43]: Password
            - generic [ref=e44]:
              - textbox "Password" [ref=e45]: diner
              - button [ref=e46] [cursor=pointer]
          - button "Register" [active] [ref=e53] [cursor=pointer]
          - generic [ref=e54]: Already have an account? Login instead.
  - contentinfo [ref=e55]:
    - generic [ref=e56]:
      - navigation [ref=e57]:
        - link "Franchise" [ref=e58] [cursor=pointer]:
          - /url: /franchise-dashboard
        - link "About" [ref=e59] [cursor=pointer]:
          - /url: /about
        - link "History" [ref=e60] [cursor=pointer]:
          - /url: /history
      - paragraph [ref=e61]: "© 2024 JWT Pizza LTD. All rights reserved. Version: 20000101.000000"
```

# Test source

```ts
  1  | import { test, expect } from 'playwright-test-coverage';
  2  | 
  3  | test('updateUser', async ({ page }) => {
  4  |   const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  5  |   await page.goto('/');
  6  |   await page.getByRole('link', { name: 'Register' }).click();
  7  |   await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  8  |   await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  9  |   await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  10 |   await page.getByRole('button', { name: 'Register' }).click();
  11 | 
> 12 |   await page.getByRole('link', { name: 'pd' }).click();
     |                                                ^ Error: locator.click: Test timeout of 5000ms exceeded.
  13 | 
  14 |   await expect(page.getByRole('main')).toContainText('pizza diner');
  15 |   await page.getByRole('button', { name: 'Edit' }).click();
  16 |   await expect(page.locator('h3')).toContainText('Edit user');
  17 |   await page.getByRole('button', { name: 'Update' }).click();
  18 | 
  19 |   await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });
  20 | 
  21 |   await expect(page.getByRole('main')).toContainText('pizza diner');
  22 | });
  23 | 
```