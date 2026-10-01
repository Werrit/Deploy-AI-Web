// Run with an existing Playwright install: node web/check.cjs [preview URL]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.setDefaultTimeout(120000);
    const failures = [];
    const requests = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && !response.url().includes('/api/')) failures.push(`${response.status()} ${response.url()}`); });
    page.on('request', request => requests.push(request.url()));
    const base = process.argv[2] || 'http://127.0.0.1:7860/';
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of ['home', 'flowers', 'detection', 'retrieval', 'chat']) {
          await page.goto(`${base}#${route}`);
          await page.locator(`[data-page="${route}"] h1`).waitFor();
          await page.evaluate(() => document.fonts.ready);
          assert.equal(await page.locator('[data-page]:visible').count(), 1);
          assert.equal(await page.locator('html').getAttribute('lang'), 'vi');
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: overflow at ${width}px in ${colorScheme}`);
          if (width >= 1024 && route === 'home') {
            assert.ok(await page.locator('.site-header').evaluate(el => el.offsetHeight <= 80));
            assert.ok(await page.locator('.hero h1').evaluate(el => el.offsetHeight <= parseFloat(getComputedStyle(el).lineHeight) * 2 + 2), 'Hero must fit two lines');
            assert.ok(await page.locator('.hero-actions').evaluate(el => el.getBoundingClientRect().bottom < innerHeight));
          }
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`${base}#flowers`);
    await page.locator('[data-flower="1"]').click();
    assert.equal(await page.locator('.result-title').count(), 0);
    await page.locator('#flowers-upload').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('bad') });
    assert.match(await page.locator('#flowers-error').textContent(), /JPG/);
    await page.locator('#flowers-upload').setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') });
    await page.waitForFunction(() => document.querySelector('#flowers-error').textContent.includes('Không thể đọc'));
    await page.locator('#flowers-upload').setInputFiles(path.join(__dirname, 'assets/flowers.webp'));
    await page.waitForFunction(() => document.querySelector('#flowers-image-type').textContent === 'Ảnh của bạn');
    assert.equal(await page.locator('.result-title').count(), 0, 'No predictions before inference');
    const predictionResponse = page.waitForResponse(response => response.url().endsWith('/api/classifier/predict'));
    await page.locator('#flowers-predict').click();
    const prediction = await predictionResponse;
    assert.equal(prediction.status(), 200);
    assert.equal((await prediction.json()).predictions.length, 3);
    await page.locator('.result-title').waitFor();
    assert.ok(Number.parseFloat(await page.locator('.result-top-score').textContent()) >= 0);
    await page.locator('#flowers-reset').click();
    assert.equal(await page.locator('.result-title').count(), 0);
    await page.route('**/api/classifier/predict', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Mô hình chưa sẵn sàng.' }) }));
    await page.locator('#flowers-predict').click();
    await page.waitForFunction(() => document.querySelector('#flowers-error').textContent.includes('chưa sẵn sàng'));
    assert.equal(await page.locator('.result-title').count(), 0);
    assert.equal(await page.locator('#flowers-predict').isEnabled(), true);
    await page.unroute('**/api/classifier/predict');
    await page.goto(`${base}#detection`);
    assert.equal(await page.locator('.detection-box').count(), 3);
    await page.locator('#confidence').fill('95');
    assert.equal(await page.locator('.detection-box').count(), 1);
    await page.locator('#confidence').fill('100');
    assert.equal(await page.locator('.detection-box').count(), 0);
    await page.locator('#confidence').fill('35');
    await page.locator('#show-labels').uncheck();
    assert.equal(await page.locator('.detection-box span:visible').count(), 0);
    await page.goto(`${base}#retrieval`);
    await page.locator('[data-query="flowers"]').click();
    assert.equal(await page.locator('.gallery-card').count(), 3);
    await page.locator('.gallery-card').first().click();
    assert.equal(await page.locator('dialog[open]').count(), 1);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.ok(await page.locator('.gallery-card').first().evaluate(el => el === document.activeElement));
    await page.locator('[data-query-mode="image"]').click();
    await page.locator('#image-query button[type="submit"]').click();
    assert.match(await page.locator('#retrieval-upload-error').textContent(), /Chọn/);
    await page.locator('#retrieval-upload').setInputFiles(path.join(__dirname, 'assets/flowers.webp'));
    await page.waitForFunction(() => !document.querySelector('#retrieval-reference').hidden);
    await page.locator('#image-query button[type="submit"]').click();
    assert.match(await page.locator('#gallery-description').textContent(), /không được xử lý/);
    await page.goto(`${base}#chat`);
    await page.locator('[data-chat-prompt="returns"]').click();
    await page.waitForFunction(() => document.querySelector('.message.assistant') && !document.querySelector('.message.assistant').hasAttribute('aria-busy'));
    assert.equal(await page.locator('#chat-error').textContent(), '');
    await page.locator('.source-detail summary').first().click();
    assert.match(await page.locator('.source-detail p').first().textContent(), /7 ngày/);
    await page.locator('#clear-chat').click();
    assert.equal(await page.locator('.message').count(), 0);
    let submitted;
    await page.route('**/api/chat', route => {
      submitted = route.request().postDataJSON();
      const events = [{ type: 'sources', items: [{ source: '<img src=x>', text: '<script>alert(1)</script>' }] }, { type: 'token', text: '<img src=x onerror=alert(1)>' }, { type: 'done' }];
      return route.fulfill({ contentType: 'text/event-stream', body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('') });
    });
    await page.locator('#chat-input').fill('<img src=x onerror=alert(1)>');
    await page.locator('.send-button').click();
    assert.match(await page.locator('.message.user').textContent(), /<img/);
    assert.equal(await page.locator('.message.user img').count(), 0);
    await page.waitForFunction(() => !document.querySelector('.message.assistant').hasAttribute('aria-busy'));
    assert.equal(await page.locator('.message.assistant img, .message.assistant script').count(), 0);
    assert.deepEqual(submitted.history, []);
    await page.locator('#chat-input').fill('Câu hỏi tiếp theo');
    await page.locator('.send-button').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.message.assistant')].every(message => !message.hasAttribute('aria-busy')));
    assert.equal(submitted.history.length, 2);
    await page.unroute('**/api/chat');
    await page.goto(`${base}#home/about`);
    assert.equal(await page.locator('#about-heading').evaluate(el => el === document.activeElement), true);
    await page.goto(`${base}#home`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(() => [...document.querySelectorAll('.home-page img')].every(img => img.complete && img.naturalWidth > 0));
    await page.evaluate(() => window.scrollTo(0, 0));
    const output = process.env.SCREENSHOT_DIR;
    if (output) {
      fs.mkdirSync(output, { recursive: true });
      for (const route of ['home', 'flowers', 'detection', 'retrieval', 'chat']) {
        await page.goto(`${base}#${route}`);
        if (route === 'flowers') {
          await page.locator('[data-flower="0"]').click();
          await page.locator('#flowers-predict').click();
          await page.locator('.result-title').waitFor();
        }
        if (route === 'detection') await page.locator('#show-labels').check();
        if (route === 'retrieval') { await page.locator('[data-query-mode="text"]').click(); await page.locator('[data-query="mountains"]').click(); }
        if (route === 'chat') {
          await page.locator('#clear-chat').click();
          await page.locator('[data-chat-prompt="returns"]').click();
          await page.waitForFunction(() => document.querySelector('.message.assistant') && !document.querySelector('.message.assistant').hasAttribute('aria-busy'));
          await page.locator('.source-detail summary').first().click();
        }
        await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
        await page.waitForFunction(() => window.scrollY === 0);
        await page.screenshot({ path: path.join(output, `${route}.jpg`), quality: 80, fullPage: true });
      }
      await page.setViewportSize({ width: 375, height: 900 });
      await page.goto(`${base}#home`);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: path.join(output, 'home-mobile.jpg'), quality: 80, fullPage: true });
    }
    assert.deepEqual(failures, [], 'Browser errors or missing assets');
    assert.ok(requests.every(url => url.startsWith(base) || url.startsWith('blob:') || url.startsWith('data:')), 'Preview must stay local');
    assert.ok(requests.some(url => url.endsWith('/api/classifier/predict')), 'Flower UI must call the classifier');
    assert.ok(requests.some(url => url.endsWith('/api/chat')), 'Chat UI must call the RAG API');
    console.log('PASS: five pages, four widths, both themes, uploads, detection controls, gallery dialog, real classifier and RAG APIs, error recovery, chat history, sources, and safe text.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
