import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'fs';
puppeteer.use(StealthPlugin());

(async () => {
  // Launch browser and create a new page
  const browser = await puppeteer.launch({ headless: false }); // Set headless to false for visualization
  const page = await browser.newPage();

  // Navigate to the desired page
  await page.goto('https://www.youtube.com/watch?v=aLJfvepNA08');

  // Wait for the 'div.more-button' element to appear in the DOM
  await page.waitForSelector('div.more-button', { visible: true });

  await new Promise(resolve => setTimeout(resolve, 10000));

  // Click the 'div.more-button' element once it's found
//   await page.click('div.more-button');

// Select all the 'div.more-button' elements
const buttons = await page.$$('div.more-button');

// Loop through the buttons and click each one
for (let button of buttons) {
  await button.click();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Adjust the timeout based on your needs
}

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Close the browser
//   await browser.close();
})();
