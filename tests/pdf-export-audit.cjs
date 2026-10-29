const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173/index.html');
  await page.click('[data-tab="6"]');
  await page.click('[data-start]');
  await page.waitForSelector('[data-mock] .choices button');
  for (const label of ['問題のみPDF','解答・解説PDF','問題＋解答PDF']) {
   const pending = page.waitForEvent('popup');
   await page.getByRole('button',{name:label}).click();
   const popup = await pending;
   await popup.waitForLoadState('domcontentloaded');
   const text = await popup.locator('body').innerText();
   const pdf = await popup.pdf({format:'A4'});
   assert.equal(pdf.subarray(0,4).toString(),'%PDF');
   assert.ok(pdf.length > 1000);
   if(label==='問題のみPDF') assert.doesNotMatch(text,/正解：|解答・解説/);
   if(label==='解答・解説PDF') assert.match(text,/正解：/);
   if(label==='問題＋解答PDF') assert.match(text,/解答・解説/);
   await popup.close();
  }

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const copyText = async (kind, label) => {
    await page.getByRole('button', { name: label }).click();
    await page.waitForFunction(() => (document.querySelector('[data-copy-status]')?.textContent || '').includes('コピーしました'));
    return page.evaluate(() => navigator.clipboard.readText());
  };
  const questionCopy = await copyText('questions', '問題のみテキスト');
  assert.match(questionCopy, /問題/);
  assert.doesNotMatch(questionCopy, /正解：|解答・解説/);
  const answerCopy = await copyText('answers', '解答・解説テキスト');
  assert.match(answerCopy, /正解：/);
  assert.match(answerCopy, /解説：/);
  const combinedCopy = await copyText('combined', '問題＋解答テキスト');
  assert.match(combinedCopy, /問題/);
  assert.match(combinedCopy, /解答・解説/);
  assert.match(combinedCopy, /正解：/);
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
