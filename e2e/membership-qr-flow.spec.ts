import { expect, test } from "@playwright/test";

const MEMBER_EMAIL = "member@example.com";
const MEMBER_PASSWORD = "memberpass123";
const MEMBER_ID = "member-user-1";
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "adminpass123";

test.setTimeout(90_000);

async function installTestDoubles(page: import("@playwright/test").Page, storageKey: string) {
  await page.addInitScript((key) => {
    const globalWindow = window as typeof window & {
      __PLAYWRIGHT_USE_MOCK_SUPABASE__?: boolean;
      __PLAYWRIGHT_QR_SCANNER__?: {
        register: (handler: (decodedText: string) => void) => () => void;
        emit: (decodedText: string) => void;
      };
    };

    globalWindow.__PLAYWRIGHT_USE_MOCK_SUPABASE__ = true;

    if (localStorage.getItem("__playwright_mock_active_key__") !== key) {
      localStorage.removeItem("__playwright_mock_supabase_state__");
      localStorage.setItem("__playwright_mock_active_key__", key);
    }

    const handlers = new Set<(decodedText: string) => void>();
    globalWindow.__PLAYWRIGHT_QR_SCANNER__ = {
      register(handler) {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      emit(decodedText) {
        for (const handler of handlers) {
          handler(decodedText);
        }
      },
    };
  }, storageKey);
}

async function loginMember(page: import("@playwright/test").Page) {
  page.setDefaultTimeout(20_000);
  await page.goto("/login", { waitUntil: "commit", timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible({ timeout: 60_000 });

  await page.getByRole("textbox", { name: /^Email$/i }).fill(MEMBER_EMAIL);
  await page.getByLabel("Password").fill(MEMBER_PASSWORD);

  await Promise.all([
    page.waitForURL(/\/subscription-tier/, { timeout: 60_000 }),
    page.getByRole("button", { name: "Login" }).click(),
  ]);
}

async function loginAdmin(page: import("@playwright/test").Page) {
  page.setDefaultTimeout(20_000);
  await page.goto("/admin/login", { waitUntil: "commit", timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Admin Login/i })).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Admin Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL(/\/admin\/dashboard/),
    page.getByRole("button", { name: "Login as Admin" }).click({ force: true }),
  ]);
}

async function emitQrScan(page: import("@playwright/test").Page, payload: Record<string, string>) {
  await page.evaluate((value) => {
    const globalWindow = window as typeof window & {
      __PLAYWRIGHT_QR_SCANNER__?: {
        emit: (decodedText: string) => void;
      };
    };

    globalWindow.__PLAYWRIGHT_QR_SCANNER__?.emit(JSON.stringify(value));
  }, payload);
}

test("member picks monthly cash plan, admin confirms, then scans login and logout QR codes", async ({ page }, testInfo) => {
  const memberPage = page;
  const storageKey = `membership-qr-flow-${testInfo.project.name}-${Date.now()}`;
  await installTestDoubles(memberPage, storageKey);

  await loginMember(memberPage);
  await expect(memberPage.getByRole("heading", { name: "Your Fitness Journey" })).toBeVisible();
  await expect(memberPage.getByRole("heading", { name: "MONTHLY" })).toBeVisible();
  await memberPage.getByRole("button", { name: "SELECT PLAN" }).nth(1).click();
  await expect(memberPage.getByRole("heading", { name: "Payment Details" })).toBeVisible();
  await memberPage.getByRole("button", { name: /Cash \(Admin Confirmation Required\)/i }).click({ force: true });
  await memberPage.getByRole("button", { name: /Pay/ }).click({ force: true });

  await expect(memberPage.getByRole("heading", { name: "Awaiting Admin Confirmation" })).toBeVisible();
  await memberPage.getByRole("button", { name: "Close" }).click({ force: true });

  const adminPage = await memberPage.context().newPage();
  await installTestDoubles(adminPage, storageKey);
  await loginAdmin(adminPage);
  await expect(adminPage.getByRole("heading", { name: "Pending Payment" })).toBeVisible();
  await expect(adminPage.getByText("MONTHLY")).toBeVisible();
  await adminPage.getByRole("button", { name: "Confirm" }).click();
  await expect(adminPage.getByText("No Pending Payments")).toBeVisible();

  await memberPage.goto("/dashboard");
  await expect(memberPage.getByText("NOT CHECKED IN")).toBeVisible();
  await expect(memberPage.getByRole("button", { name: "Check in" })).toBeVisible();
  await memberPage.getByRole("button", { name: "Check in" }).click({ force: true });
  await expect(memberPage.getByText("CHECK-IN QR CODE")).toBeVisible();

  await adminPage.getByRole("button", { name: "Scan QR Code" }).click();
  await adminPage.getByRole("button", { name: "Start" }).click();
  await emitQrScan(adminPage, {
    id: MEMBER_ID,
    type: "checkin",
    tier: "monthly",
    timestamp: new Date().toISOString(),
  });
  await expect(adminPage.getByText(/Check-in successful/i).first()).toBeVisible();

  await memberPage.waitForTimeout(200);
  await memberPage.getByRole("button", { name: "Admin Confirmed Scan" }).click();
  await expect(memberPage.getByText("Check-in approved. Session is active.")).toBeVisible();
  await expect(memberPage.getByText("Checked In")).toBeVisible();
  await memberPage.waitForTimeout(200);
  await memberPage.getByRole("button", { name: "Check out" }).click({ force: true });
  await expect(memberPage.getByRole("button", { name: "Admin Confirmed Scan" })).toBeVisible({ timeout: 10_000 });

  await emitQrScan(adminPage, {
    id: MEMBER_ID,
    type: "checkout",
    tier: "monthly",
    timestamp: new Date().toISOString(),
  });
  await expect(adminPage.getByText(/Check-out successful/i).first()).toBeVisible();
  await memberPage.waitForTimeout(200);
  await memberPage.getByRole("button", { name: "Admin Confirmed Scan" }).click();
  await expect(memberPage.getByRole("button", { name: "Check in" })).toBeVisible({ timeout: 10_000 });
});
