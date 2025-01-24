// ===================== working ===========================

// import puppeteer from 'puppeteer-extra';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import { promises as fs } from 'fs';
// puppeteer.use(StealthPlugin());

// (async () => {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     await page.setViewport({
//         width: 1600,
//         height: 1000,
//         deviceScaleFactor: 1,
//     });

//     let data;

//     // Network listener to capture responses
//     const networkListener = async (response) => {
//         try {
//             const request = response.request();
//             const method = request.method().toUpperCase();
//             if (method === 'OPTIONS') return; // Skip OPTIONS requests

//             const url = response.url();
//             // console.log('Intercepted URL:', url); // Log all URLs to debug

//             // Check for the correct URL pattern
//             if (!url.includes('youtubei/v1/next?prettyPrint=false')) return;
            
//             const responseData = await response.json();
//             console.log('Response Data:', responseData);  // Log the response data
//             if (responseData) {
//                 data = responseData;
//             }
//         } catch (err) {
//             console.error('Error in network listener:', err); // Log any errors
//         }
//     };

//     // Register the network listener after navigating to the page
//     await page.goto('https://www.youtube.com/watch?v=aLJfvepNA08');
//     page.on('response', networkListener); // Add listener after page starts loading

//     // Wait for the data to be captured (up to 60 seconds)
//     for (let i = 0; i < 20; i++) {
//         await new Promise(resolve => setTimeout(resolve, 1000));
//         if (data) break; // Exit when data is available
//     }

//     if (!data) {
//         console.error('No data received from the network response.');
//         return;
//     }

//     try {
//         await fs.writeFile('./extractedcomments.json', JSON.stringify(data, null, 2), 'utf-8');
//         console.log('Saved the data to file');
//     } catch (err) {
//         console.error('Error saving data to file:', err);
//     }

//     console.log(data);
//     await browser.close();
// })();

// ===================== working ===========================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'fs';
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setViewport({
        width: 1600,
        height: 1000,
        deviceScaleFactor: 1,
    });

    let allComments = []; // To store all comments data

    // Network listener to capture responses
    const networkListener = async (response) => {
        try {
            const request = response.request();
            const method = request.method().toUpperCase();
            if (method === 'OPTIONS') return; // Skip OPTIONS requests

            const url = response.url();

            if (url.includes('youtubei/v1/next?prettyPrint=false')) {
                const responseData = await response.json();
                console.log('Response Data:', responseData); // Log the full response data

                // Check the response structure and append comments based on the actual data structure
                if (responseData) {
                    // Example: Let's say the comments are stored in continuationItems
                    allComments.push(responseData);
                    // console.log(`Captured ${responseData.continuationItems.length} comments. Total: ${allComments.length}`);
                } else {
                    console.log('No continuationItems in responseData. Check response structure.');
                }
            }
        } catch (err) {
            console.error('Error in network listener:', err);
        }
    };

    // Register the network listener after navigating to the page
    page.on('response', networkListener); // Add listener after page starts loading
    await page.goto('https://www.youtube.com/watch?v=aLJfvepNA08');


    // Wait for the page to load a bit and initialize
    await page.waitForSelector('div#contents'); // Ensure the comments section exists

    let lastHeight = await page.evaluate('document.documentElement.scrollHeight'); // Get initial page height

    // Scroll until no more new comments are loaded
    let scrollAttempts = 0;
    while (scrollAttempts < 19) { // Limit the number of scrolls to avoid endless loop
        // Scroll to the bottom of the page
        await page.evaluate(() => {
            window.scrollTo(0, document.documentElement.scrollHeight);
        });

        // Wait for new comments to load
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds to load more comments

        // Get the new height of the page
        const newHeight = await page.evaluate('document.documentElement.scrollHeight');

        // If the page height hasn't changed, we've reached the bottom
        if (newHeight === lastHeight) {
            console.log('Reached the end of the comments.');
            break; // Exit the loop if no more comments are loading
        }

        lastHeight = newHeight;
        scrollAttempts++;
        console.log(`Scrolled ${scrollAttempts} times.`);
    }

    // Wait a bit to ensure all responses are captured (if any are still pending)
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for any pending responses

    // Remove the network listener after data is collected
    page.off('response', networkListener);

    // Check if comments were captured before trying to write to a file
    if (allComments.length > 0) {
        // Save the captured comments to a file
        try {
            await fs.writeFile('./all_comments.json', JSON.stringify(allComments, null, 2), 'utf-8');
            console.log('Saved all comments to file');
        } catch (err) {
            console.error('Error saving data to file:', err);
        }
    } else {
        console.log('No comments were captured.');
    }

    // Log the captured comments (optional)
    console.log(allComments);

    // Close the browser
    await browser.close();
})();

// ===================== working ===========================

// import puppeteer from 'puppeteer-extra';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import { promises as fs } from 'fs';
// puppeteer.use(StealthPlugin());

// (async () => {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     await page.setViewport({
//         width: 1600,
//         height: 1000,
//         deviceScaleFactor: 1,
//     });

//     let allComments = []; // To store all comments data

//     // Network listener to capture responses
//     const networkListener = async (response) => {
//         try {
//             const request = response.request();
//             const method = request.method().toUpperCase();
//             if (method === 'OPTIONS') return; // Skip OPTIONS requests

//             const url = response.url();

//             if (url.includes('youtubei/v1/next?prettyPrint=false')) {
//                 const responseData = await response.json();
//                 console.log('Response Data:', responseData); // Log the full response data

//                 // Check the response structure and append comments based on the actual data structure
//                 if (responseData) {
//                     // Example: Let's say the comments are stored in continuationItems
//                     allComments.push(responseData);
//                     console.log(`Captured ${responseData.items.length} comments. Total: ${allComments.length}`);
//                 } else {
//                     console.log('No continuationItems in responseData. Check response structure.');
//                 }
//             }
//         } catch (err) {
//             console.error('Error in network listener:', err);
//         }
//     };

//     // Register the network listener after navigating to the page
//     page.on('response', networkListener); // Add listener after page starts loading
//     await page.goto('https://www.youtube.com/watch?v=aLJfvepNA08');

//     // Wait for the page to load a bit and initialize
//     await page.waitForSelector('div#contents'); // Ensure the comments section exists

//     let lastHeight = await page.evaluate('document.documentElement.scrollHeight'); // Get initial page height

//     // Scroll until no more new comments are loaded
//     let scrollAttempts = 0;
//     let maxScrollAttempts = 40; // Limit the number of scrolls to avoid an infinite loop
//     let scrolledEnough = false;

//     // Gradual scroll with delay
//     const smoothScroll = async (page, delay = 100) => {
//         await page.evaluate(async (delay) => {
//             const distance = 300; // Scroll by 300px each time
//             let scrolled = 0;
//             const totalHeight = document.documentElement.scrollHeight;
            
//             // Gradually scroll with a delay
//             while (scrolled < totalHeight) {
//                 window.scrollBy(0, distance);
//                 scrolled += distance;
//                 await new Promise(resolve => setTimeout(resolve, delay)); // Wait for the delay
//             }
//         }, delay); // Pass the delay as a parameter
//     };

//     // Gradually scroll the page until comments are loaded
//     while (scrollAttempts < maxScrollAttempts && !scrolledEnough) {
//         // Perform gradual scroll
//         await smoothScroll(page, 150); // 150ms delay between scrolls for smooth transition

//         // Wait for new comments to load
//         await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds to load more comments

//         // Get the new height of the page
//         const newHeight = await page.evaluate('document.documentElement.scrollHeight');

//         // If the page height hasn't changed, we've reached the bottom
//         if (newHeight === lastHeight) {
//             console.log('Reached the end of the comments.');
//             scrolledEnough = true; // Stop if no more comments are loading
//         } else {
//             lastHeight = newHeight;
//             scrollAttempts++;
//             console.log(`Scrolled ${scrollAttempts} times.`);
//         }
//     }

//     // Wait a bit to ensure all responses are captured (if any are still pending)
//     await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for any pending responses

//     // Remove the network listener after data is collected
//     page.off('response', networkListener);

//     // Check if comments were captured before trying to write to a file
//     if (allComments.length > 0) {
//         // Save the captured comments to a file
//         try {
//             await fs.writeFile('./all_comments.json', JSON.stringify(allComments, null, 2), 'utf-8');
//             console.log('Saved all comments to file');
//         } catch (err) {
//             console.error('Error saving data to file:', err);
//         }
//     } else {
//         console.log('No comments were captured.');
//     }

//     // Log the captured comments (optional)
//     console.log(allComments);

//     // Close the browser
//     await browser.close();
// })();

// ===================== slow scroll working above ===========================








