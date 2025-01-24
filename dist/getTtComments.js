import puppeteer from 'puppeteer';
import { PuppeteerExtra } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'fs';
// Create PuppeteerExtra instance
const puppeteerExtra = new PuppeteerExtra(puppeteer);
// Add stealth plugin
puppeteerExtra.use(StealthPlugin());
async function getYouTubeComments(page, videoUrl) {
    let allComments = [];
    const networkListener = async (response) => {
        try {
            const request = response.request();
            const method = request.method().toUpperCase();
            if (method === 'OPTIONS')
                return;
            const url = response.url();
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
    page.on('response', networkListener);
    await page.goto(videoUrl);
    await page.waitForSelector('div#contents');
    let lastHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    let scrollAttempts = 0;
    const maxScrollAttempts = 40;
    let scrolledEnough = false;
    const smoothScroll = async (page, delay = 100) => {
        await page.evaluate(async (delay) => {
            const distance = 300;
            let scrolled = 0;
            const totalHeight = document.documentElement.scrollHeight;
            while (scrolled < totalHeight) {
                window.scrollBy(0, distance);
                scrolled += distance;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }, delay);
    };
    while (scrollAttempts < maxScrollAttempts && !scrolledEnough) {
        await smoothScroll(page, 150);
        await new Promise(resolve => setTimeout(resolve, 3000));
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
    const buttons = await page.$$('div.more-button');
    for (let button of buttons) {
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
    page.off('response', networkListener);
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
// Update main function to use puppeteerExtra instead of puppeteer
async function main() {
    const browser = await puppeteerExtra.launch({
        headless: false,
        defaultViewport: {
            width: 1600,
            height: 1000,
            deviceScaleFactor: 1
        }
    });
    try {
        const page = await browser.newPage();
        const videoUrl = 'https://www.youtube.com/watch?v=aLJfvepNA08';
        await getYouTubeComments(page, videoUrl);
    }
    catch (error) {
        console.error('Error occurred:', error);
    }
    finally {
        await browser.close();
    }
}
main().catch(console.error);
