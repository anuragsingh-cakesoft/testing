import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'fs';
puppeteer.use(StealthPlugin());
export async function getYouTubeComments(page, videoUrl) {
    let allComments = [];
    // Network listener to capture the comments data
    const networkListener = async (response) => {
        try {
            const request = response.request();
            const method = request.method().toUpperCase();
            if (method === 'OPTIONS')
                return;
            const url = response.url();
            // Check for the continuation of comments
            if (url.includes('youtubei/v1/next?prettyPrint=false')) {
                const responseData = await response.json();
                if (responseData) {
                    allComments.push(responseData);
                }
                else {
                    console.log('No continuationItems in responseData. Check response structure.');
                }
            }
        }
        catch (err) {
            console.error('Error in network listener:', err);
        }
    };
    // Add the network listener
    page.on('response', networkListener);
    // Go to the video URL
    await page.goto(videoUrl);
    // Wait for the comments section to load
    await page.waitForSelector('div#contents');
    let lastHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    let scrollAttempts = 0;
    const maxScrollAttempts = 40;
    let scrolledEnough = false;
    // Smooth scrolling function
    const smoothScroll = async (page, delay = 100) => {
        await page.evaluate(async (delay) => {
            const distance = 300; // The distance to scroll each time
            let scrolled = 0;
            const totalHeight = document.documentElement.scrollHeight;
            while (scrolled < totalHeight) {
                window.scrollBy(0, distance);
                scrolled += distance;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }, delay);
    };
    // Scroll the page until we have scrolled enough or hit the maximum attempts
    while (scrollAttempts < maxScrollAttempts && !scrolledEnough) {
        await smoothScroll(page, 150);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for new comments to load
        const newHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        if (newHeight === lastHeight) {
            console.log('Reached the end of the comments.');
            scrolledEnough = true;
        }
        else {
            lastHeight = newHeight;
            scrollAttempts++;
            console.log(`Scrolled ${scrollAttempts} times.`);
        }
    }
    // Wait for the "more" buttons and click them to load more comments
    const buttons = await page.$$('div.more-button');
    for (let button of buttons) {
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for new comments to load
    }
    // Wait a bit before finishing
    await new Promise(resolve => setTimeout(resolve, 5000));
    // Remove the network listener after we're done
    page.off('response', networkListener);
    // If comments were captured, save them to a file
    if (allComments.length > 0) {
        try {
            await fs.writeFile('./all_comments.json', JSON.stringify(allComments, null, 2), 'utf-8');
            console.log('Saved all comments to file');
        }
        catch (err) {
            console.error('Error saving data to file:', err);
        }
    }
    else {
        console.log('No comments were captured.');
    }
}
