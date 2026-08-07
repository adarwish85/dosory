# QA smoke 2026-07-28 — visual evidence note

Tenant: qasmoke20260728131942 (prod, additive; owner ahmeddarwesh+qasmoke20260728131942@gmail.com)

Every flow was verified visually in a LIVE (headed) browser session during the smoke:
signup form + "Available!" subdomain check, tenant-subdomain login, dashboard + onboarding
wizard, customers list (before/after create: "QA Smoke Customer Ltd", Total 1), leads list
("QA Smoke Lead", Total 1), invoices list (INV #1, PAID $150.00), tasks list ("QA smoke
task", Total 1), payments page (mock-data finding), /dashboard/customers/new fall-through
(finding, fixed). Those screenshots are embedded in the session transcript.

File-based re-capture via HEADLESS Playwright was blocked: prod login silently resets for
headless Chromium (see qa-smoke-headless-login-blocked.png) while the same credentials work
headed — consistent with reCAPTCHA/App-Check bot protection doing its job. Not an app bug.

---

## 2026-08-07 — Radix menus do not respond to synthetic `.click()` (harness note, NOT a bug)

The language switcher (`components/language-switcher.tsx`) appeared unresponsive during an
earlier automated pass. It is not broken for real users. Measured on qa-smoke, headed:

| interaction                                                              | menu items that appear       |
| ------------------------------------------------------------------------ | ---------------------------- |
| `document.querySelector('button[aria-label="Change language"]').click()` | **0**                        |
| Playwright `page.click(...)` (real, trusted pointer events)              | **2** — "English", "العربية" |

Selecting "العربية" via the trusted click flips `document.documentElement.dir` to `rtl` and
persists `localStorage["dosory.locale"] = "ar"`. Evidence: `language-switcher-ar.png`.

**Why:** the switcher is a Radix `DropdownMenu`, whose `DropdownMenuTrigger` opens on
**`pointerdown`**. A synthetic `element.click()` dispatches only a `click` MouseEvent with no
preceding pointerdown/pointerup, so Radix never opens. Humans always produce pointerdown.
This applies to **every** Radix menu/dropdown/select in the app, not just this one.

**How to drive locale in tests — two options, both fine:**

```js
// Preferred: exercise the real control (trusted events).
await page.click('button[aria-label="Change language"]');
await page.locator('[role="menuitem"]', { hasText: "العربية" }).click();

// Shortcut when the switcher is not what is under test — set the store and reload.
// Key is LOCALE_STORAGE_KEY from lib/i18n/config.ts.
await page.evaluate(() => localStorage.setItem("dosory.locale", "ar"));
await page.reload();
```

Do **not** conclude a Radix control is broken from a failed `.click()` — re-test with a
trusted click before filing anything.
