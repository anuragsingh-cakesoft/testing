import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'fs';
puppeteer.use(StealthPlugin());

// (async () => {
//     const browser = await puppeteer.launch({ headless: false }); // Launch browser
//     const page = await browser.newPage(); // Create a new page

//     // Go to the desired webpage
//     await page.goto('https://www.youtube.com/watch?v=aLJfvepNA08'); // Replace with the URL you want to visit

//     // Function to scroll down the page
//     async function scrollToBottom() {
//         await page.evaluate(async () => {
//             await new Promise((resolve) => {
//                 let scrollHeight = document.body.scrollHeight;
//                 window.scrollTo(0, scrollHeight);
//                 resolve();
//             });
//         });
//     }

//     // Function to click all "Show More" buttons (or similar)
//     async function clickShowMoreButtons() {
//         let moreButtonsExist = true;
//         while (moreButtonsExist) {
//             // Find all "Show more" buttons
//             const moreButtons = await page.$$eval('div.more-button', buttons => {
//                 return buttons || [];
//             });

//             if (moreButtons.length === 0) {
//                 moreButtonsExist = false; // No more "Show more" buttons
//                 console.log('No more "Show more" buttons found.');
//             } else {
//                 // Loop through each button and click it
//                 for (const button of moreButtons) {
//                     await button.click();
//                     console.log('Clicked "Show more" button.');
//                     // Wait for replies or new content to load
//                     await new Promise(resolve => setTimeout(resolve, 2000)); // Adjust the wait time as needed
//                 }
//             }
//             // Scroll to the bottom again after clicking
//             await scrollToBottom();
//         }
//     }

//     // Scroll to the bottom and click all "Show more" buttons
//     await scrollToBottom(); // Scroll once before starting to click
//     await clickShowMoreButtons(); // Click all "Show more" buttons

//     // Wait for a few seconds to allow any final content to load
//     await new Promise(resolve => setTimeout(resolve, 5000)); 

//     // Close the browser
//     await browser.close();
// })();


// const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false }); // Launch browser
    const page = await browser.newPage(); // Create a new page

    await page.setViewport({
        width: 1600,
        height: 1000,
        deviceScaleFactor: 1,
    });

    // Go to the desired URL
    await page.goto('https://www.youtube.com/watch?v=aLJfvepNA08'); // Replace with the URL where the comments exist

    // Wait for the comments section (e.g., #contents) to ensure it has loaded
    await page.waitForSelector('div#contents'); 

    let lastHeight = await page.evaluate('document.documentElement.scrollHeight'); // Get initial page height

    // Function to smoothly scroll the page
    const smoothScroll = async (page, delay = 100) => {
        await page.evaluate(async (delay) => {
            const distance = 300; // Scroll by 300px each time
            let scrolled = 0;
            const totalHeight = document.documentElement.scrollHeight;
            
            // Gradually scroll with a delay
            while (scrolled < totalHeight) {
                window.scrollBy(0, distance);
                scrolled += distance;
                await new Promise(resolve => setTimeout(resolve, delay)); // Wait for the delay
            }
        }, delay); // Pass the delay as a parameter
    };

    // Gradually scroll the page until comments are loaded
    let scrollAttempts = 0;
    let maxScrollAttempts = 40; // Limit the number of scrolls to avoid an infinite loop
    let scrolledEnough = false;

    while (scrollAttempts < maxScrollAttempts && !scrolledEnough) {
        // Perform gradual scroll
        await smoothScroll(page, 150); // 150ms delay between scrolls for smooth transition

        // Wait for new comments to load
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds to load more comments

        // Get the new height of the page
        const newHeight = await page.evaluate('document.documentElement.scrollHeight');

        // If the page height hasn't changed, we've reached the bottom
        if (newHeight === lastHeight) {
            console.log('Reached the end of the comments.');
            scrolledEnough = true; // Stop if no more comments are loading
        } else {
            lastHeight = newHeight;
            scrollAttempts++;
            console.log(`Scrolled ${scrollAttempts} times.`);
        }
    }

    // Now, look for "Show More" buttons and click them
    const moreButtons = await page.$$eval('div.more-button', buttons => {
        if (!buttons) {
            return []; // Return an empty array if no buttons are found
        }
        return buttons.map(button => button.textContent); // Or any other property you need
    });

    // const lst = [...moreButtons]
    // console.log(lst)
    // await moreButtons.click();

    // let cnt = moreButtons.length != 0 ? 1 : 0;

    // Wait for a few seconds to allow any final content to load
    await new Promise(resolve => setTimeout(resolve, 5000)); 

    // Close the browser
    // await browser.close();
})();
