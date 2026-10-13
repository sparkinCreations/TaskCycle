#!/usr/bin/env node
/**
 * Phase 0 smoke test — "the empty app boots through all three phases with no
 * console errors" (docs/00-REFACTOR-PLAN.md, Phase 0 exit criterion).
 *
 * What it checks, against a fresh (empty-localStorage) profile:
 *   1. index.html loads and the boot orchestrator reaches "interactive":
 *      `document.documentElement.dataset.appLoaded === 'true'` — set by
 *      uiBoot.hideAppLoader() at the end of Phase 3 (also on the first-run
 *      choice path, so a brand-new profile still passes).
 *   2. Zero console.error entries and zero uncaught page errors during boot.
 *   3. Zero failed network requests for same-origin resources (a 404'd module
 *      or asset is a scaffold bug, not a warning).
 *   4. The boot timing marks for all three phases exist (mc:phase:core /
 *      features / ui), proving each phase actually ran rather than the loader
 *      being hidden by a fallback path.
 *
 * Self-contained: starts its own static server on 127.0.0.1:SMOKE_PORT (8092 by
 * default — distinct from the app dev server on 8090 and miniCycle's 8080), so
 * `npm run test:smoke` needs nothing running.
 *
 * Usage:  node tests/automated/run-smoke-test.cjs
 *         SMOKE_PORT=8093 PW_BROWSER=webkit node tests/automated/run-smoke-test.cjs
 */
const path = require('path');
const { startStaticServer } = require('./_static-server.cjs');

const WEB_ROOT = path.resolve(__dirname, '..', '..');
const PORT = Number(process.env.SMOKE_PORT) || 8092;
const BROWSER = process.env.PW_BROWSER || 'chromium';
const BOOT_TIMEOUT_MS = 45000;

// Console noise that is NOT a boot failure. Keep this list short and explicit;
// anything not matched here fails the run.
const IGNORED_CONSOLE_ERROR_PATTERNS = [
    // Service worker registration is expected to fail on a plain static origin in
    // some headless configurations; the app treats it as non-fatal.
    /serviceWorker|service worker/i,
    // UPSTREAM (miniCycle, verified identical on the source build 2026-10-12):
    // on a brand-new profile AppState holds data=null until the first-run choice
    // screen persists a routine, so settingsUIManager.setupThreeDotsToggle()
    // logs this once at boot and is retried when Settings opens
    // (modules/ui/settingsUIManager.js, "LATCH HERE, NOT ON ENTRY" comment).
    // Not a fork regression. Remove this entry once upstream downgrades it to a
    // warning or defers the setup — the fork tracks upstream here, not the reverse.
    /^State data required for three dots toggle$/
];

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m' };
const ok = (m) => console.log(`${colors.green}✅ ${m}${colors.reset}`);
const bad = (m) => console.log(`${colors.red}❌ ${m}${colors.reset}`);
const info = (m) => console.log(`${colors.cyan}ℹ️  ${m}${colors.reset}`);

async function main() {
    const { [BROWSER]: browserType } = require('playwright');
    if (!browserType) throw new Error(`Unknown PW_BROWSER "${BROWSER}" (chromium | firefox | webkit)`);

    const srv = await startStaticServer(WEB_ROOT, PORT);
    const base = `http://127.0.0.1:${PORT}`;
    info(`static server: ${base} (root ${WEB_ROOT})`);

    const browser = await browserType.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await context.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (IGNORED_CONSOLE_ERROR_PATTERNS.some((re) => re.test(text))) return;
        consoleErrors.push(text);
    });
    page.on('pageerror', (err) => pageErrors.push(err && err.message ? err.message : String(err)));
    page.on('requestfailed', (req) => {
        if (!req.url().startsWith(base)) return;
        const err = req.failure()?.errorText || 'failed';
        // ERR_ABORTED is the browser cancelling its own duplicate fetch (a
        // <link rel=modulepreload> superseded by the real import, or a request
        // outlived by navigation). The resource still loaded; a missing file
        // shows up as a 404 on the 'response' handler below, not here.
        if (err === 'net::ERR_ABORTED') return;
        failedRequests.push(`${err} ${req.url()}`);
    });
    page.on('response', (res) => {
        if (res.url().startsWith(base) && res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
    });

    let failures = 0;
    const started = Date.now();
    try {
        await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });

        // 1. Boot reached interactive
        await page.waitForFunction(
            () => document.documentElement.dataset.appLoaded === 'true',
            null,
            { timeout: BOOT_TIMEOUT_MS }
        );
        ok(`boot reached interactive in ${Date.now() - started} ms`);

        // 4. All three phases recorded timing measures (proves they ran)
        const phases = await page.evaluate(() => {
            const names = ['mc:phase:core', 'mc:phase:features', 'mc:phase:ui'];
            const out = {};
            for (const n of names) {
                const e = performance.getEntriesByName(n, 'measure').pop();
                out[n] = e ? Math.round(e.duration) : null;
            }
            return out;
        });
        for (const [name, ms] of Object.entries(phases)) {
            if (ms === null) { bad(`phase measure missing: ${name}`); failures++; }
            else ok(`${name}: ${ms} ms`);
        }

        // Give late async work (deferred feature triggers, SW messages) a moment to surface errors.
        await page.waitForTimeout(1500);

        // App shell is present
        const shell = await page.evaluate(() => ({
            appContainer: !!document.getElementById('app-container'),
            bodyLoading: document.body.classList.contains('app-loading'),
            title: document.title
        }));
        if (!shell.appContainer) { bad('#app-container not found'); failures++; } else ok('#app-container present');
        info(`document.title = "${shell.title}"`);
    } catch (e) {
        bad(`boot did not complete: ${e.message}`);
        failures++;
    }

    // 2 + 3. Error budget is zero
    if (consoleErrors.length) { bad(`${consoleErrors.length} console.error(s):`); consoleErrors.forEach((t) => console.log('   ' + t)); failures++; }
    else ok('0 console errors');
    if (pageErrors.length) { bad(`${pageErrors.length} uncaught page error(s):`); pageErrors.forEach((t) => console.log('   ' + t)); failures++; }
    else ok('0 uncaught page errors');
    if (failedRequests.length) { bad(`${failedRequests.length} failed same-origin request(s):`); failedRequests.forEach((t) => console.log('   ' + t)); failures++; }
    else ok('0 failed same-origin requests');

    await browser.close();
    await srv.close();

    console.log('');
    if (failures) { bad(`SMOKE TEST FAILED (${failures} problem group(s))`); process.exit(1); }
    ok('SMOKE TEST PASSED');
}

main().catch((e) => { bad(e.stack || e.message); process.exit(1); });
