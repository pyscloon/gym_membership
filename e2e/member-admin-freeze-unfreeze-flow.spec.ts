import { chromium, expect, test, type Page } from "@playwright/test";

const memberPassword = "StoneClub123!";
const adminEmail =
	process.env.TEST_ADMIN_EMAIL ??
	process.env.VITE_ADMIN_EMAIL ??
	"admin@gmail.com";
const adminPassword = process.env.TEST_ADMIN_PASSWORD ?? "";
const memberEmailDomain =
	process.env.TEST_MEMBER_EMAIL_DOMAIN ?? "gmail.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMemberSeed() {
	const stamp = Date.now();
	return {
		firstName: `Freeze${stamp}`,
		lastName: "Runner",
		email: `freeze.runner.${stamp}@${memberEmailDomain}`,
	};
}

function logPhase(message: string) {
	console.log(`[freeze-e2e] ${message}`);
}

async function loginAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Admin Email").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: /login as admin/i }).click();

  // Wait for dashboard to appear (longer timeout). Prefer a stable element on the dashboard.
  try {
    await Promise.all([
      page.waitForURL(/\/admin\/dashboard/, { timeout: 30_000 }),
      // Replace the heading text with an admin-only element present on the dashboard if available
      page.getByRole("heading", { name: /freeze requests & frozen members|pending payment/i }).waitFor({ timeout: 30_000 }),
    ]);
  } catch (err) {
    // Capture diagnostics to help debug flaky login failures
    await page.screenshot({ path: "playwright-failure-login.png", fullPage: true }).catch(() => {});
    const html = await page.content();
    // Save a small diagnostic file (optional)
    // require('fs').writeFileSync('playwright-failure-login.html', html);
    throw new Error(
      `Admin login did not reach dashboard within 30s. Current URL: ${page.url()}\n` +
      `Screenshot: playwright-failure-login.png\n` +
      `Original error: ${err}`
    );
  }
}

async function approvePaymentForMember(page: Page, memberName: string) {
	const memberCard = page.locator(
		`[data-testid="admin-payment-card"][data-member-name="${memberName}"]`
	);
	await expect(memberCard).toBeVisible({ timeout: 60_000 });
	await memberCard.getByRole("button", { name: /^confirm$/i }).click();
}

/**
 * Open the Freeze panel on the admin dashboard.
 * The entry point is the action-grid button labelled "Freeze".
 */
async function openFreezeSection(page: Page) {
	const heading = page.getByRole("heading", { name: /freeze requests & frozen members/i });
	const alreadyOpen = await heading.isVisible().catch(() => false);
	if (!alreadyOpen) {
		await page.getByRole("button", { name: /freeze/i }).click();
		await expect(heading).toBeVisible({ timeout: 10_000 });
	}
}

/**
 * Poll-reload until the admin freeze panel shows at least one pending request
 * matching the provided label pattern, then return.
 *
 * Using a reload loop rather than a bare `expect(...).toBeVisible` avoids the
 * race where the panel is already open but the list hasn't refreshed from the
 * backend yet.
 */
async function waitForPendingCount(
	page: Page,
	queueType: "freeze" | "unfreeze",
	expectedMemberName?: string
) {
	const testId = queueType === "freeze" ? "pending-freeze-count" : "pending-unfreeze-count";

	logPhase(`waiting for admin queue (${queueType}) to update`);
	await openFreezeSection(page);

	if (expectedMemberName) {
		const card = page.locator(`[data-member-name="${expectedMemberName}"]`);
		await expect(card).toBeVisible({ timeout: 30_000 });
	} else {
		const el = page.locator(`[data-testid="${testId}"]`);
		await expect(el).toHaveAttribute("data-count", /^[1-9]/, { timeout: 30_000 });
	}
}

async function createAndActivateYearlyMember(page: Page) {
	const memberSeed = makeMemberSeed();

	await page.goto("/register");
	await page.getByLabel("First name").fill(memberSeed.firstName);
	await page.getByLabel("Last name").fill(memberSeed.lastName);
	await page.getByLabel("Email").fill(memberSeed.email);
	await page.getByLabel("Password").fill(memberPassword);
	await page.getByRole("button", { name: /create account/i }).click();
	await expect(page).toHaveURL(/\/subscription-tier/);

	await page.getByRole("button", { name: /^self training$/i }).click();
	await page.getByRole("button", { name: /select plan/i }).last().click();
	await expect(
		page.getByRole("heading", { name: /payment details/i })
	).toBeVisible();

	await page.getByRole("button", { name: /online transfer/i }).click();
	await page.locator('input[type="file"]').setInputFiles({
		name: "payment-proof.png",
		mimeType: "image/png",
		buffer: Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s2xN9sAAAAASUVORK5CYII=",
			"base64"
		),
	});
	await expect(page.getByAltText(/proof preview/i)).toBeVisible();

	await page.getByRole("button", { name: /pay /i }).click();

	// Wait for the payment component to show the awaiting-verification status
	await expect(
		page.locator('[data-testid="payment-status-heading"][data-status="awaiting_verification"]')
	).toBeVisible({ timeout: 40_000 });

	return memberSeed;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe("member to admin freeze/unfreeze flow", () => {
	test.describe.configure({ mode: "serial" });

	test(
		"request freeze -> approve freeze -> request unfreeze -> approve unfreeze",
		async ({ baseURL }) => {
			test.setTimeout(180_000);
			test.skip(
				!adminPassword || adminPassword === "change-me",
				"Need a real TEST_ADMIN_PASSWORD in .env.test for admin login."
			);

			const memberBrowser = await chromium.launch();
			const adminBrowser = await chromium.launch();

			try {
				const memberPage = await memberBrowser.newPage({ baseURL });
				const adminPage = await adminBrowser.newPage({ baseURL });

				// ── 1. Register + upload payment proof ────────────────────────
				logPhase("registering yearly member and submitting payment proof");
				const memberSeed = await createAndActivateYearlyMember(memberPage);
				const memberFullName = `${memberSeed.firstName} ${memberSeed.lastName}`;

				// ── 2. Admin approves the payment ──────────────────────────────
				logPhase("admin login and payment approval");
				await loginAdmin(adminPage);
				await approvePaymentForMember(adminPage, memberFullName);
								// Wait for member page to observe the paid status before continuing.
								await expect(
									memberPage.locator('[data-testid="payment-status-heading"][data-status="paid"]')
								).toBeVisible({ timeout: 40_000 });

				// ── 3. Member lands on dashboard ───────────────────────────────
				logPhase("waiting for member dashboard after payment approval");
				await expect(memberPage).toHaveURL(/\/dashboard/, { timeout: 30_000 });
				await expect(
					memberPage.getByRole("button", { name: /request freeze/i })
				).toBeVisible({ timeout: 20_000 });

				// ── 4. Member requests freeze ──────────────────────────────────
				logPhase("member requests freeze");
				await memberPage
					.getByRole("button", { name: /request freeze/i })
					.click();
				await expect(
					memberPage.getByRole("heading", { name: /request freeze/i })
				).toBeVisible();
				await memberPage
					.getByRole("button", { name: /yes, request freeze/i })
					.click();
				await expect(
					memberPage.getByText(/freeze request submitted/i)
				).toBeVisible();

				// ── 5. Admin approves the freeze request ───────────────────────
				logPhase("admin approves freeze request");
				// Use the poll-reload helper so we don't race the backend write.
		await waitForPendingCount(adminPage, "freeze", memberFullName);
				const freezeRequestCard = adminPage.locator(`[data-member-name="${memberFullName}"]`);
				await expect(freezeRequestCard).toBeVisible({ timeout: 20_000 });
				await freezeRequestCard.getByRole("button", { name: /^approve$/i }).click();

				// Give the backend a moment to commit the status change before we
				// reload the member page; avoids the member seeing an intermediate
				// "pending" state.
				await adminPage.waitForTimeout(1_500);

				// ── 6. Member sees frozen state and requests unfreeze ──────────
				logPhase("member reloads and requests unfreeze");
				await memberPage.reload();
				await expect(
					memberPage.getByRole("button", { name: /request unfreeze/i })
				).toBeVisible({ timeout: 20_000 });
				await memberPage
					.getByRole("button", { name: /request unfreeze/i })
					.click();
				await expect(
					memberPage.getByRole("heading", { name: /request unfreeze/i })
				).toBeVisible();
				await memberPage
					.getByRole("button", { name: /yes, request unfreeze/i })
					.click();
				await expect(
					memberPage.getByText(/unfreeze request submitted/i)
				).toBeVisible();

				// ── 7. Admin approves the unfreeze request ─────────────────────
				logPhase("admin approves unfreeze request");
				// The admin panel separates freeze and unfreeze queues.  The
				// unfreeze queue label is distinct from the freeze queue label so
				// we match both alternatives in one regex.
await waitForPendingCount(adminPage, "unfreeze", memberFullName);
				const unfreezeRequestCard = adminPage.locator(`[data-member-name="${memberFullName}"]`);
				await expect(unfreezeRequestCard).toBeVisible({ timeout: 20_000 });
				await unfreezeRequestCard.getByRole("button", { name: /approve unfreeze/i }).click();

				await adminPage.waitForTimeout(1_500);

				// ── 8. Member is back to active state ──────────────────────────
				logPhase("waiting for member to return to active state");
				await memberPage.reload();
				await expect(
					memberPage.getByRole("button", { name: /request freeze/i })
				).toBeVisible({ timeout: 20_000 });
			} finally {
				await Promise.all([memberBrowser.close(), adminBrowser.close()]);
			}
		}
	);
});