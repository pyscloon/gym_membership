import { test, expect, chromium, type Page } from "@playwright/test";

const memberPassword = "StoneClub123!";
const adminEmail = process.env.TEST_ADMIN_EMAIL ?? process.env.VITE_ADMIN_EMAIL ?? "admin@gmail.com";
const adminPassword = process.env.TEST_ADMIN_PASSWORD ?? "";

function makeMemberSeed() {
  const stamp = Date.now();
  return {
    firstName: `Rock${stamp}`,
    lastName: "Runner",
    email: `rock.runner.${stamp}@example.com`,
  };
}

async function loginAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Admin Email").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: /login as admin/i }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

async function installQrDriver(page: Page) {
  await page.addInitScript(() => {
    let handler: ((decodedText: string) => void) | null = null;

    (
      window as Window & {
        __PLAYWRIGHT_QR_SCANNER__?: { register: (cb: (decodedText: string) => void) => () => void };
        __emitPlaywrightQr?: (decodedText: string) => void;
      }
    ).__PLAYWRIGHT_QR_SCANNER__ = {
      register(cb) {
        handler = cb;
        return () => {
          if (handler === cb) {
            handler = null;
          }
        };
      },
    };

    (window as Window & { __emitPlaywrightQr?: (decodedText: string) => void }).__emitPlaywrightQr = (decodedText: string) => {
      handler?.(decodedText);
    };
  });
}

async function emitQr(page: Page, qrValue: string) {
  await page.evaluate((value) => {
    (window as Window & { __emitPlaywrightQr?: (decodedText: string) => void }).__emitPlaywrightQr?.(value);
  }, qrValue);
}

async function openAdminScanner(page: Page) {
  await page.getByRole("button", { name: /scan qr code/i }).click();
  await expect(page.getByText(/scan without leaving your current section/i)).toBeVisible();
  await page.getByRole("button", { name: /^start$/i }).click();
}

async function getMemberQrValue(page: Page) {
  const qrBox = page.getByTestId("member-session-qr");
  await expect(qrBox).toBeVisible();
  const qrValue = await qrBox.getAttribute("data-qr-value");

  if (!qrValue) {
    throw new Error("No QR value on member page");
  }

  return qrValue;
}

async function approveMemberQr(page: Page) {
  await page.getByRole("button", { name: /admin confirmed scan/i }).click();
}

test.describe("member to admin full cave flow", () => {
  test.describe.configure({ mode: "serial" });

  test("register -> plan -> admin verify -> check in -> scan -> check out -> scan", async ({ baseURL }) => {
    test.setTimeout(120000);
    test.skip(!adminPassword || adminPassword === "change-me", "Need real TEST_ADMIN_PASSWORD in .env.test for admin cave login.");

    const memberSeed = makeMemberSeed();
    const memberBrowser = await chromium.launch();
    const adminBrowser = await chromium.launch();

    try {
      const memberPage = await memberBrowser.newPage({ baseURL });
      const adminPage = await adminBrowser.newPage({ baseURL });

      await installQrDriver(adminPage);

      await memberPage.goto("/register");
      await memberPage.getByLabel("First name").fill(memberSeed.firstName);
      await memberPage.getByLabel("Last name").fill(memberSeed.lastName);
      await memberPage.getByLabel("Email").fill(memberSeed.email);
      await memberPage.getByLabel("Password").fill(memberPassword);
      await memberPage.getByRole("button", { name: /create account/i }).click();
      await expect(memberPage).toHaveURL(/\/subscription-tier/);

      await memberPage.getByRole("button", { name: /select plan/i }).nth(1).click();
      await expect(memberPage.getByRole("heading", { name: /payment details/i })).toBeVisible();
      await memberPage.getByRole("button", { name: /online transfer/i }).click();
      await memberPage.locator('input[type="file"]').setInputFiles({
        name: "payment-proof.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s2xN9sAAAAASUVORK5CYII=",
          "base64"
        ),
      });
      await memberPage.getByRole("button", { name: /pay /i }).click();
      await expect(memberPage.getByText(/awaiting payment verification/i)).toBeVisible();

      await loginAdmin(adminPage);

      const memberCard = adminPage.locator(
        `[data-testid="admin-payment-card"][data-member-name="${memberSeed.firstName} ${memberSeed.lastName}"]`
      );
      await expect(memberCard).toBeVisible({ timeout: 60000 });
      await memberCard.getByRole("button", { name: /^confirm$/i }).click();

      await expect(memberPage.getByText(/payment successful/i)).toBeVisible({ timeout: 20000 });
      await memberPage.getByRole("button", { name: /continue to dashboard/i }).click();
      await expect(memberPage).toHaveURL(/\/dashboard/);

      await openAdminScanner(adminPage);

      await memberPage.getByTestId("member-session-fab").click();
      const checkInQr = await getMemberQrValue(memberPage);
      await emitQr(adminPage, checkInQr);
      await expect(
        adminPage.getByText(new RegExp(`Check-in successful for ${memberSeed.firstName} ${memberSeed.lastName}`, "i")).first()
      ).toBeVisible({ timeout: 15000 });
      await memberPage.waitForTimeout(250);
      await approveMemberQr(memberPage);
      await expect(memberPage.getByTestId("member-session-fab")).toHaveAttribute("aria-label", /check-out/i);

      await memberPage.getByTestId("member-session-fab").click();
      const checkOutQr = await getMemberQrValue(memberPage);
      await emitQr(adminPage, checkOutQr);
      await expect(
        adminPage.getByText(new RegExp(`Check-out successful for ${memberSeed.firstName} ${memberSeed.lastName}`, "i")).first()
      ).toBeVisible({ timeout: 15000 });
      await memberPage.waitForTimeout(250);
      await approveMemberQr(memberPage);
      await expect(memberPage.getByTestId("member-session-fab")).toHaveAttribute("aria-label", /check-in/i);
    } finally {
      await Promise.all([memberBrowser.close(), adminBrowser.close()]);
    }
  });
});
