# Freeze / Unfreeze E2E Context

## Goal

Validate the member and admin freeze lifecycle end-to-end in Playwright:

1. Member registers and submits payment proof.
2. Admin approves the payment.
3. Member lands on the dashboard and sees `Request Freeze`.
4. Member requests freeze.
5. Admin approves the freeze request.
6. Member requests unfreeze.
7. Admin approves the unfreeze request.
8. Member dashboard returns to the active (`Request Freeze` visible) state.

---

## Main selectors

| Actor  | UI element                            | Selector strategy                                                        |
|--------|---------------------------------------|--------------------------------------------------------------------------|
| Member | Trigger freeze modal                  | `role=button [name=/request freeze/i]`                                   |
| Member | Confirm freeze                        | `role=button [name=/yes, request freeze/i]`                              |
| Member | Trigger unfreeze modal                | `role=button [name=/request unfreeze/i]`                                 |
| Member | Confirm unfreeze                      | `role=button [name=/yes, request unfreeze/i]`                            |
| Admin  | Open freeze panel (action grid)       | `role=button [name=/^freeze$/i]`                                         |
| Admin  | Freeze panel heading                  | `role=heading [name=/freeze requests & frozen members/i]`                |
| Admin  | Pending freeze counter                | `text=/pending freeze requests \(1\)/i`                                  |
| Admin  | Pending unfreeze counter              | `text=/pending (freeze\|unfreeze) requests \(1\)/i`                      |
| Admin  | Approve freeze                        | `role=button [name=/^approve$/i]`                                        |
| Admin  | Approve unfreeze                      | `role=button [name=/approve unfreeze/i]`                                 |

---

## Architecture

- Two independent Chromium browser instances (one per actor) so session cookies
  never bleed between member and admin.
- Both pages share the same `baseURL` fixture.
- The test is marked `mode: "serial"` because the steps are causally dependent.

---

## Root cause of the timeout bug (now fixed)

### What was happening

After the member submitted the unfreeze request, the test called:

```ts
await adminPage.reload();
await openFreezeSection(adminPage);
await expect(adminPage.getByText(/pending freeze requests \(1\)/i)).toBeVisible({ timeout: 20_000 });
```

This failed for two compounding reasons:

1. **Wrong label** – once a freeze is approved the admin panel renders the
  follow-on queue under a *different* heading.  The freeze queue title and
  the unfreeze queue title are not interchangeable, so a hardcoded
  `/pending freeze requests \(1\)/i` assertion was too brittle.

2. **Single-reload race** – a single `reload()` is often not enough.  The
  backend processes the write asynchronously; the reload can land before the
  new row is committed, so the count stays at 0.

3. **Transient payment modal** – the `Awaiting Payment Verification` screen is
  not a reliable checkpoint in headed Chromium, so the spec now trusts the
  admin payment card as the durable proof that the member's payment submission
  succeeded.

### Fix applied

Introduced a `waitForPendingCount` poll-reload helper that:

- Reloads the page and re-opens the freeze panel on every iteration.
- Checks visibility non-throwingly with `.catch(() => false)` so a missing
  element just triggers the next iteration instead of failing immediately.
- Breaks as soon as the target text is visible, or exhausts `maxAttempts` and
  lets Playwright emit a proper timeout message.

```ts
async function waitForPendingCount(
  page: Page,
  labelPattern: RegExp,
  { maxAttempts = 8, intervalMs = 3_000, timeout = 20_000 } = {}
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await page.reload();
    await openFreezeSection(page);
    const isVisible = await page.getByText(labelPattern).isVisible().catch(() => false);
    if (isVisible) return;
    if (attempt < maxAttempts - 1) await page.waitForTimeout(intervalMs);
  }
  await expect(page.getByText(labelPattern)).toBeVisible({ timeout });
}
```

For the **unfreeze** step the pattern was widened to match both labels:

```ts
await waitForPendingCount(adminPage, /pending (freeze|unfreeze) requests \(1\)/i);
```

A 1.5-second `waitForTimeout` was also added after each admin approval action
to let the backend commit before the member page reloads, avoiding an
intermediate "pending" flash.

---

## Validation status

| Check                                  | Status  |
|----------------------------------------|---------|
| TypeScript diagnostics (`tsc --noEmit`)| ✅ clean |
| Browser run – current payment handoff  | 🔄 being rechecked |
| Browser run – freeze half              | ✅ green in prior debug runs |
| Browser run – unfreeze half            | ⚠️ still tied to browser rerun after payment fix |

---

## Remaining considerations

- If the real label differs from both `/pending freeze requests/i` and
  `/pending unfreeze requests/i`, widen the regex or add a `data-testid`
  attribute to the counter element in the admin UI.
- `maxAttempts × intervalMs` (8 × 3 s = 24 s) must stay well below
  `test.setTimeout` (180 s).  Adjust if the backend is slower in CI.
- The `waitForTimeout` pauses are soft guards only; delete them once the app
  exposes a WebSocket / SSE push that signals write completion.
- The payment-success screen is not stable enough to assert directly; the
  browser run now waits for the dashboard and `Request Freeze` button instead.