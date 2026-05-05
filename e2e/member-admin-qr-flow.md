# Member to Admin QR Flow E2E Test Explanation

This document provides a detailed line-by-line explanation of the end-to-end test file `member-admin-qr-flow.spec.ts`. This test simulates the entire journey of a new member registering, paying for a subscription, an admin approving the payment, and the member performing QR-based check-in and check-out at the gym.

## Imports and Setup

```typescript
1: import { test, expect, chromium, type Page } from "@playwright/test";
```
Imports necessary Playwright testing functions: `test` for defining the test, `expect` for assertions, `chromium` for launching browser instances manually, and `Page` type for TypeScript definitions.

```typescript
3: const memberPassword = "StoneClub123!";
4: const adminEmail = process.env.TEST_ADMIN_EMAIL ?? process.env.VITE_ADMIN_EMAIL ?? "admin@gmail.com";
5: const adminPassword = process.env.TEST_ADMIN_PASSWORD ?? "";
6: const memberEmailDomain = process.env.TEST_MEMBER_EMAIL_DOMAIN ?? "gmail.com";
```
Defines constants used throughout the test. 
- `memberPassword`: A fixed password for the test member.
- `adminEmail`, `adminPassword`: Admin credentials loaded from environment variables (falling back to defaults if not present).
- `memberEmailDomain`: The domain used to generate unique member emails.

## Helper Functions

### `makeMemberSeed`
```typescript
8: function makeMemberSeed() {
9:   const stamp = Date.now();
10:   return {
11:     firstName: `Rock${stamp}`,
12:     lastName: "Runner",
13:     email: `rock.runner.${stamp}@${memberEmailDomain}`,
14:   };
15: }
```
Generates a unique user data seed based on the current timestamp. This ensures every test run creates a fresh, non-colliding user account.

### `loginAdmin`
```typescript
17: async function loginAdmin(page: Page) {
18:   await page.goto("/admin/login");
19:   await page.getByLabel("Admin Email").fill(adminEmail);
20:   await page.getByLabel("Password").fill(adminPassword);
21:   await page.getByRole("button", { name: /login as admin/i }).click();
22:   await expect(page).toHaveURL(/\/admin\/dashboard/);
23: }
```
Navigates the given `page` to the admin login route, fills in the admin credentials, clicks the login button, and verifies the login was successful by checking if the URL changes to `/admin/dashboard`.

### `installQrDriver`
```typescript
25: async function installQrDriver(page: Page) {
26:   await page.addInitScript(() => {
27:     let handler: ((decodedText: string) => void) | null = null;
28: 
29:     (
30:       window as Window & {
31:         __PLAYWRIGHT_QR_SCANNER__?: { register: (cb: (decodedText: string) => void) => () => void };
32:         __emitPlaywrightQr?: (decodedText: string) => void;
33:       }
34:     ).__PLAYWRIGHT_QR_SCANNER__ = {
35:       register(cb) {
36:         handler = cb;
37:         return () => {
38:           if (handler === cb) {
39:             handler = null;
40:           }
41:         };
42:       },
43:     };
44: 
45:     (window as Window & { __emitPlaywrightQr?: (decodedText: string) => void }).__emitPlaywrightQr = (decodedText: string) => {
46:       handler?.(decodedText);
47:     };
48:   });
49: }
```
Injects a script into the browser page before it loads. This script sets up a mock QR scanner environment (`__PLAYWRIGHT_QR_SCANNER__`) to bypass actual camera requirements during automated testing. It creates a global function `__emitPlaywrightQr` which can be triggered later to simulate scanning a QR code with specific data.

### `emitQr`
```typescript
51: async function emitQr(page: Page, qrValue: string) {
52:   await page.evaluate((value) => {
53:     (window as Window & { __emitPlaywrightQr?: (decodedText: string) => void }).__emitPlaywrightQr?.(value);
54:   }, qrValue);
55: }
```
Executes JavaScript within the browser context to trigger the mocked `__emitPlaywrightQr` function injected earlier, passing a simulated `qrValue`. This mimics an admin scanning a physical QR code.

### `openAdminScanner`
```typescript
57: async function openAdminScanner(page: Page) {
58:   await page.getByRole("button", { name: /scan qr code/i }).click();
59:   await expect(page.getByText(/scan without leaving your current section/i)).toBeVisible();
60:   await page.getByRole("button", { name: /^start$/i }).click();
61: }
```
Clicks the "Scan QR Code" button on the admin dashboard, waits for the scanner modal/section to appear, and clicks "Start" to activate the (mocked) scanner.

### `getMemberQrValue`
```typescript
63: async function getMemberQrValue(page: Page) {
64:   const qrBox = page.getByTestId("member-session-qr");
65:   await expect(qrBox).toBeVisible();
66:   const qrValue = await qrBox.getAttribute("data-qr-value");
67: 
68:   if (!qrValue) {
69:     throw new Error("No QR value on member page");
70:   }
71: 
72:   return qrValue;
73: }
```
Finds the QR code element on the member's page using the test ID `member-session-qr`, ensures it is visible, and extracts the raw QR data from its `data-qr-value` attribute. This value is what the mock scanner will "scan".

### `approveMemberQr`
```typescript
75: async function approveMemberQr(page: Page) {
76:   await page.getByRole("button", { name: /admin confirmed scan/i }).click();
77: }
```
Simulates the member dismissing the confirmation dialog on their device after a successful scan by clicking the "admin confirmed scan" button.

## The Test Suite

```typescript
79: test.describe("member to admin full QR code flow", () => {
80:   test.describe.configure({ mode: "serial" });
```
Groups the tests logically. `mode: "serial"` ensures that tests inside this block run sequentially instead of in parallel, though in this specific file there is only one large test.

### The Main Test Definition
```typescript
82:   test("register -> plan -> admin verify -> check in -> scan -> check out -> scan", async ({ baseURL }) => {
83:     test.setTimeout(120000);
84:     test.skip(!adminPassword || adminPassword === "change-me", "Need real TEST_ADMIN_PASSWORD in .env.test for admin cave login.");
```
Defines the main end-to-end test.
- `setTimeout(120000)`: Extends the default timeout to 2 minutes since this test covers a long, multi-step user journey involving two separate browser instances.
- `test.skip(...)`: Skips the test if a valid admin password is not provided in the environment variables.

### Browser Initialization
```typescript
86:     const memberSeed = makeMemberSeed();
87:     const memberBrowser = await chromium.launch();
88:     const adminBrowser = await chromium.launch();
```
Generates the unique user details and explicitly launches two separate instances of the Chromium browser. This is crucial for testing the real-time interactions between a member's device and an admin's device simultaneously.

```typescript
90:     try {
91:       const memberPage = await memberBrowser.newPage({ baseURL });
92:       const adminPage = await adminBrowser.newPage({ baseURL });
93: 
94:       await installQrDriver(adminPage);
```
Wraps the test logic in a `try...finally` block to ensure browsers are closed even if the test fails.
Creates a new page/tab in both the `memberBrowser` and `adminBrowser`, applying the application's base URL.
Installs the mock QR driver only on the `adminPage` since the admin is the one performing the scanning.

### Member Registration and Payment Flow
```typescript
96:       await memberPage.goto("/register");
97:       await memberPage.getByLabel("First name").fill(memberSeed.firstName);
98:       await memberPage.getByLabel("Last name").fill(memberSeed.lastName);
99:       await memberPage.getByLabel("Email").fill(memberSeed.email);
100:       await memberPage.getByLabel("Password").fill(memberPassword);
101:       await memberPage.getByRole("button", { name: /create account/i }).click();
102:       await expect(memberPage).toHaveURL(/\/subscription-tier/);
```
Navigates the `memberPage` to registration, fills out the form with the generated `memberSeed` data, submits it, and verifies redirection to the subscription selection page.

```typescript
104:       await memberPage.getByRole("button", { name: /select plan/i }).nth(1).click();
105:       await expect(memberPage.getByRole("heading", { name: /payment details/i })).toBeVisible();
106:       await memberPage.getByRole("button", { name: /online transfer/i }).click();
107:       await memberPage.locator('input[type="file"]').setInputFiles({
108:         name: "payment-proof.png",
109:         mimeType: "image/png",
110:         buffer: Buffer.from(
111:           "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s2xN9sAAAAASUVORK5CYII=",
112:           "base64"
113:         ),
114:       });
115:       await expect(memberPage.getByAltText(/proof preview/i)).toBeVisible();
116:       await memberPage.getByRole("button", { name: /pay /i }).click();
117:       await expect(memberPage.getByRole("heading", { name: /awaiting payment verification/i })).toBeVisible();
```
- Selects the second subscription plan available.
- Chooses "Online Transfer" as the payment method.
- Uploads a mock payment proof image (a tiny 1x1 transparent PNG represented as a base64 string).
- Confirms the preview is visible, submits the payment, and asserts that the member is now on the "Awaiting Payment Verification" screen.

### Admin Payment Verification Flow
```typescript
119:       await loginAdmin(adminPage);
120: 
121:       const memberCard = adminPage.locator(
122:         `[data-testid="admin-payment-card"][data-member-name="${memberSeed.firstName} ${memberSeed.lastName}"]`
123:       );
124:       await expect(memberCard).toBeVisible({ timeout: 60000 });
125:       await memberCard.getByRole("button", { name: /^confirm$/i }).click();
```
Switches to the `adminPage`, logs in as an admin, and looks for the pending payment card corresponding to the newly registered member. It waits up to 60 seconds for this card to appear (accounting for potential backend processing delays) and clicks "Confirm" to approve the membership.

### Member Redirection Post-Approval
```typescript
127:       await expect(memberPage.getByText(/payment successful/i)).toBeVisible({ timeout: 20000 });
128:       await memberPage.getByRole("button", { name: /continue to dashboard/i }).click();
129:       await expect(memberPage).toHaveURL(/\/dashboard/);
```
Switches back to the `memberPage`, which should automatically update (likely via polling or WebSockets) to show a "Payment successful" message after the admin confirmed it. The member clicks to continue and verifies they reach their dashboard.

### Admin Prepares to Scan
```typescript
131:       await openAdminScanner(adminPage);
```
On the `adminPage`, opens the QR scanner interface.

### Member Check-In Flow
```typescript
133:       await memberPage.getByTestId("member-session-fab").click();
134:       const checkInQr = await getMemberQrValue(memberPage);
135:       await emitQr(adminPage, checkInQr);
136:       await expect(
137:         adminPage.getByText(new RegExp(`Check-in successful for ${memberSeed.firstName} ${memberSeed.lastName}`, "i")).first()
138:       ).toBeVisible({ timeout: 15000 });
139:       await memberPage.waitForTimeout(250);
140:       await approveMemberQr(memberPage);
141:       await expect(memberPage.getByTestId("member-session-fab")).toHaveAttribute("aria-label", /check-out/i);
```
- Member clicks the Floating Action Button (FAB) to bring up their Check-In QR code.
- Extracts the QR data value.
- Simulates the admin scanning this data on the `adminPage`.
- Verifies the admin sees a success message confirming the check-in for this specific user.
- After a short pause, the member acknowledges the successful scan on their own device.
- Verifies the member's FAB has updated its state, now indicating it's ready for "check-out".

### Member Check-Out Flow
```typescript
143:       await memberPage.getByTestId("member-session-fab").click();
144:       const checkOutQr = await getMemberQrValue(memberPage);
145:       await emitQr(adminPage, checkOutQr);
146:       await expect(
147:         adminPage.getByText(new RegExp(`Check-out successful for ${memberSeed.firstName} ${memberSeed.lastName}`, "i")).first()
148:       ).toBeVisible({ timeout: 15000 });
149:       await memberPage.waitForTimeout(250);
150:       await approveMemberQr(memberPage);
151:       await expect(memberPage.getByTestId("member-session-fab")).toHaveAttribute("aria-label", /check-in/i);
```
Mirrors the check-in process. The member brings up the QR code (now for checking out), the admin scans it, success is verified on the admin side, the member acknowledges it, and the member's button reverts to "check-in".

### Cleanup
```typescript
152:     } finally {
153:       await Promise.all([memberBrowser.close(), adminBrowser.close()]);
154:     }
155:   });
156: });
```
Ensures that regardless of whether the test passes or fails, both Chromium browser instances are properly closed and cleaned up to prevent hanging processes and memory leaks.
