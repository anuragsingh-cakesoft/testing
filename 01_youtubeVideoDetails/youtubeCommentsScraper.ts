import { promises as fs } from 'fs';
import { Page, HTTPResponse } from 'puppeteer'; 

import { processYouTubeComments } from './youtubeCommentsScrapperFilteringLogic.js';

export async function getYouTubeComments(page: Page, youtube: any): Promise<void> {
    let allComments: any[] = [];

    const networkListener = async (response: HTTPResponse) => {
        try {
            const request = response.request();
            const method = request.method().toUpperCase();
            if (method === 'OPTIONS') return;

            const url = response.url();

            if (url.includes('youtubei/v1/next?prettyPrint=false')) {
                const responseData = await response.json();
                if (responseData) {
                    allComments.push(responseData);
                } else {
                    console.log('No continuationItems in responseData. Check response structure.');
                }
            }
        } catch (err) {
            console.error('Error in network listener:', err);
        }
    };

    page.on('response', networkListener);
    await page.goto(youtube.youTubeVideoId);
    await page.waitForSelector('div#contents');

    let lastHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    let scrollAttempts = 0;
    const maxScrollAttempts = 40;
    let scrolledEnough = false;

    const smoothScroll = async (page: Page, delay = 100): Promise<void> => {
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
        } else {
            lastHeight = newHeight;
            scrollAttempts++;
            console.log(`Scrolled ${scrollAttempts} times.`);
        }
    }

    if(youtube.shallExtractReplies){
        const buttons = await page.$$('div.more-button');
        for (let button of buttons) {
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    page.off('response', networkListener);

    if (allComments.length > 0) {
        try {
            const structuredComments = processYouTubeComments(allComments,youtube.shallExtractReplies);
            const finalObject = {
                youTubeVideo: youtube.youTubeVideoId,
                youTubeComments: structuredComments
            }
            
            await Promise.all([
                fs.writeFile('./outputs/finalobject.json', JSON.stringify(finalObject, null, 2), 'utf-8'),
                fs.writeFile('./outputs/all_comments.json', JSON.stringify(allComments, null, 2), 'utf-8'),
                fs.writeFile('./outputs/structured_comments.json', JSON.stringify(structuredComments, null, 2), 'utf-8')
            ]);
            
            console.log('Saved all comments to files');
            console.log(`Processed ${structuredComments.length} main comments with their replies`);
        } catch (err) {
            console.error('Error saving data to file:', err);
        }
    } else {
        console.log('No comments were captured.');
    }
}