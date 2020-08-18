// node app.js
const puppeteer = require('puppeteer');
const credentials = require('./credentials');

const URL = `https://secure.rec1.com/NY/village-of-scarsdale-ny/catalog`;
const TARGET_TIME_SLOT = '06:00 PM';
const TARGET_TENNIS_COURTS = ['All Weather Tennis Court 2', 'All Weather Tennis Court 3', 'All Weather Tennis Court 4'];


(async (email, password) => {
  try {
    const startTime = new Date();
    console.log('Now:', startTime);

    // Create a new browser instance
    const browser = await puppeteer.launch({
      headless: false,
      timeout: 10000,
      args: ['--window-size=2000,2800'], // This specifies the Chrome window size
    });

    // create a page inside the browser;
    const page = await browser.newPage();
    page.setDefaultTimeout(600000);

    // navigate to a website and set the viewport
    await page.setViewport({ width: 2000, height: 1200 });
    await page.goto(URL, {
      timeout: 3000000,
    });

    // Wait until the login nagivation button appears
    const loginSelector = '#rec1-public-navigation-bar';
    await page.waitForSelector(loginSelector);

    // Find and click the login button
    await page.evaluate(() => {
        const selector = '.rec1-login-trigger';
        const links = document.querySelectorAll(selector);
        links[0].click();
    });

    // pages = await browser.pages(); // get all open pages by the browser
    // console.log(`2: ${pages.length} pages opened`);

    await page.waitForSelector(".btn-group.open");
    
    const loginPage = new Promise(x => browser.once('targetcreated', target => x(target.page())));
    await page.evaluate(() => {
        const selector = '.rec1-login-button-google';
        const links = document.querySelectorAll(selector);
        links[0].click();
    });
    await page.waitFor(1000);
    
    // pages = await browser.pages(); // get all open pages by the browser
    // console.log(`3: ${pages.length} pages opened`);

    await loginPage;
    
    const pages = await browser.pages(); // get all open pages by the browser
    // console.log(`4: ${pages.length} pages opened`);

    const popup = pages[pages.length - 1];
    const emailSelector = 'input[type="email"]';
    await popup.waitForSelector(emailSelector);
    
    await popup.type(emailSelector, email);
    await popup.click('#identifierNext');

    await popup.waitForSelector('input[type="password"]', { visible: true })
    await popup.type('input[type="password"]', password)
    await popup.waitForSelector('#passwordNext', { visible: true })
    await popup.click('#passwordNext');

    // Wait until logged in
    const isLoggedin = 'a[href="/NY/village-of-scarsdale-ny/account/logout"]';
    await page.waitForSelector(isLoggedin);
    
    const tennisReserveSelector = 'div[title="Lessons/ Reservation Tennis"]';
    await page.waitForSelector(tennisReserveSelector);
    await page.click(tennisReserveSelector);

    await page.waitForXPath("//div[contains(text(), 'Scarsdale High School Tennis Courts')]");
    const linkHandlers = await page.$x("//div[contains(text(), 'Scarsdale High School Tennis Courts')]");
    if (linkHandlers.length > 0) {
        await linkHandlers[0].click();
    } else {
        throw new Error("Link not found");
    }

    // await page.waitFor(1000);
    const nextDayButtonSelector = ".btn.interactive-grid-date-next";
    await page.waitForSelector(nextDayButtonSelector);
    await page.click(nextDayButtonSelector);
    await page.waitFor(1000);
    await page.click(nextDayButtonSelector);

    await page.waitFor(1000);
    const nextTimeButtonSelector = ".btn.interactive-grid-time-next";
    await page.click(nextTimeButtonSelector);
    await page.waitFor(1000);
    await page.click(nextTimeButtonSelector);
    await page.waitFor(1000);
    await page.click(nextTimeButtonSelector);
    await page.waitFor(1000);

    const refreshButtonSelector = ".btn.interactive-grid-refresh";
    await page.click(refreshButtonSelector);
    await page.waitFor(1000);

    const targetDivs = await page.$x("//div[contains(@class, 'rec1-catalog-group') and contains(@class, 'selected') and contains(@class, 'collapsible')]");
    console.log(`divs with class "rec1-catalog-group selected collapsible" found: ${targetDivs.length}`);
    const div = targetDivs[0];

    const table = await div.$("table.interactive-grid-table");
    const ths = await table.$$('th');
    const trs = await table.$$('tr');
    console.log(`Found ${ths.length} table columns`);
    console.log(`Found ${trs.length} table rows`);

    let columnIndex = null;
    for (let i = 0; i < ths.length; i++) {
        const th = ths[i];
        const spanHandle = await th.$('span');
        if (spanHandle !== null) {
            const text = await page.evaluate(span => span.innerHTML, spanHandle);
            if (text === TARGET_TIME_SLOT) {
                columnIndex = i;
                console.log(i, text);
                break;
            }
        }
    }
    if (columnIndex !== null) {
        console.log(`Found the target column index: ${columnIndex}`);
    }
    const now = new Date();
    let timeDiff = now - startTime; // in ms
    timeDiff /= 1000;
    const seconds = Math.round(timeDiff);
    console.log(seconds + " seconds");

    const rowIndices = [];
    for (let i = 0; i < trs.length; i++) {
        const tr = trs[i];
        const divHandles = await tr.$$('td > div');
        if (divHandles.length > 0) {
            const divHandle1 = divHandles[0];
            const text = await page.evaluate(div => div.innerHTML, divHandle1);
            const isTargetCourt = TARGET_TENNIS_COURTS.includes(text);

            const divHandle2 = divHandles[columnIndex];
            const klass = await page.evaluate(div => div.getAttribute("class"), divHandle2);
            const isAvailable = klass.includes('bg-success');
            
            console.log(`${i}: ${text} -- ${klass} -- ${isAvailable}`);
            if (isTargetCourt && isAvailable) {
                rowIndices.push(i);
            }
        }
    }
    if (rowIndices.length > 0) {
        console.log(`Found the target row indices: ${rowIndices}`);
    } else {
        console.log(`Target courts are not found!!!`);
    }

    let done = false;
    for (const rowIndex of rowIndices.sort((a, b) => b - a)) {
        const targetRow = trs[rowIndex];
        const targetCells = await targetRow.$$('td > div');
        const targetCell = targetCells[columnIndex];
        if (!done) {
            await targetCell.click();
            await page.waitFor(3000);

            const pages = await browser.pages(); // get all open pages by the browser
            console.log(`${pages.length} pages opened`);
            const popup = pages[pages.length - 1];

            const addToCartButtonSelector = ".btn.rec1-catalog-item-action.btn-success";
            await popup.waitForSelector(addToCartButtonSelector);
            await popup.click(addToCartButtonSelector);

            await page.waitFor(3000);
            const checkoutButtonSelector = "a.cart-checkout-button";
            await popup.waitForSelector(checkoutButtonSelector);
            await popup.click(checkoutButtonSelector);

            await page.waitFor(3000);
            const textareaSelector = "textarea.checkout-prompt-response";
            await page.waitForSelector(textareaSelector);
            await page.type(textareaSelector, "Kevin Han and Wade Han");

            await page.waitFor(3000);
            const submitButtonSelector = "button.checkout-continue-button";
            await page.waitForSelector(submitButtonSelector);
            await page.click(submitButtonSelector);

            await page.waitFor(3000);
            await page.$x(`//h3[contains(text(), "General Waiver")]`);
            console.log('Click the "Confirm Waiver Agreement" button');
            const confirmButtonSelector = "button.checkout-continue-button";
            await page.click(confirmButtonSelector);

            await page.waitFor(3000);
            await page.waitForXPath(`//h2[contains(text(), "Payment")]`);
            console.log('Click the "Review Transaction" button');
            const reviewButtonSelector = "button.checkout-continue-button";
            await page.click(reviewButtonSelector);

            await page.waitFor(3000);
            await page.waitForXPath(`//h3[contains(text(), "Payment Summary")]`);
            console.log('Click the "Complete Transaction" button');
            const completeButtonSelector = "button.checkout-continue-button";
            await page.click(completeButtonSelector);

            await page.waitFor(5000);

            done = true;
        } else {
            break;
        }
    }

    // close the browser
    // await browser.close();
  } catch (error) {
    // display errors
    console.log(error);
  }
})(credentials.email, credentials.password);