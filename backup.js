// node app.js
const puppeteer = require('puppeteer');
const credentials = require('./credentials');

const amazon = 'https://www.amazon.com/alm/storefront';
const domain = `${amazon}?almBrandId=VUZHIFdob2xlIEZvb2Rz&ref_=nav_cs_whole_foods_in_region`;

(async (email, password) => {
  try {
    // Create a new browser instance
    const browser = await puppeteer.launch({
      headless: false,
      timeout: 10000,
      args: ['--window-size=1200,800'], // This specifies the Chrome window size
    });

    // create a page inside the browser;
    const page = await browser.newPage();
    page.setDefaultTimeout(600000);

    // navigate to a website and set the viewport
    await page.setViewport({ width: 1200, height: 600 });
    await page.goto(domain, {
      timeout: 3000000,
    });

    await page.click('#a-autoid-0-announce');

    // Wait until asking for email
    // Then type in email and click "Continue" button
    const emailSelector = '#ap_email';
    await page.waitForSelector(emailSelector);
    await page.type(emailSelector, email);
    await page.click('#continue');

    // Wait until asking for password
    // Then type in password and click "Sign in" button
    const passwordSelector = '#ap_password';
    await page.waitForSelector(passwordSelector);
    await page.type(passwordSelector, password);
    await page.click('#signInSubmit');

    // Wait until shopping cart appears
    // Then click the shopping cart icon
    const cartSelector = '#nav-cart-count';
    await page.waitForSelector(cartSelector);
    await page.click(cartSelector);

    // Wait for the Whole Foods checkout button
    // Then click to checkout
    // Note: The id for the checkout button in for your username might be different
    const checkoutSelector = '#sc-alm-buy-box-ptc-button-VUZHIFdob2xlIEZvb2Rz-announce';
    await page.waitForSelector(checkoutSelector);
    await page.click(checkoutSelector);

    // Wait for Continue button and click it when it appears
    const continueSelector = '#a-autoid-0';
    await page.waitForSelector(continueSelector);
    await page.click(continueSelector);

    // Wait for Continue button for substitutes and click it
    const subsContSelector = '#subsContinueButton';
    await page.waitForSelector(subsContSelector);
    await page.click(subsContSelector);

    // Wait for "Schedule your order" page
    await page.waitForSelector('.ufss-widget-grid');

    // Refresh the page every 5 seconds until a delivery time window appears
    // Ring the system bell when delivery time slots become available
    let isFree = false;
    const reloadTimer = setInterval(async () => {
      if (!isFree) {
        isFree = await page.evaluate(() => {
          const selector = '.ufss-slot-price-text';
          const freeSlots = document.querySelectorAll(selector);
          let isDeliveryAvailable = false;
          freeSlots.forEach((ele) => {
            if (ele.innerText.includes('FREE') || ele.innerText.includes('$4.99')) {
              isDeliveryAvailable = true;
            }
          });
          return isDeliveryAvailable;
        });
      }

      if (isFree) {
        console.log('\u0007');
        console.log('Delivery window is available. Select a time slot and click Continue');
      } else {
        console.log('No delivery windows available. Refresh the page...');
        await page.reload();
      }
    }, 5000);

    // Stop the refresh after selecting the time slot and clicking the Continue button
    // Do it manually starting from here
    setInterval(async () => {
      if (!isFree) {
        return;
      }
      const isContinueClicked = await page.evaluate(() => {
        const selector = '.ufss-slot-price-text';
        const freeSlots = document.querySelectorAll(selector);
        let isClicked = true;
        freeSlots.forEach((ele) => {
          if (ele.innerText.includes('FREE') || ele.innerText.includes('$4.99')) {
            isClicked = false;
          }
        });
        return isClicked;
      });

      if (isFree && isContinueClicked) {
        clearInterval(reloadTimer);
      }
    }, 5000);

    // close the browser
    // await browser.close();
  } catch (error) {
    // display errors
    console.log(error);
  }
})(credentials.email, credentials.password);