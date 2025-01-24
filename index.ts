import { PuppeteerExtra } from 'puppeteer-extra';
import puppeteer, { PuppeteerNode } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ScraperType, SCRAPER_INPUTS } from './inputs.js';
import { getYouTubeComments } from './youtubeCommentsScraper.js';
import readline from 'readline';

const puppeteerExtra = new PuppeteerExtra(puppeteer as unknown as PuppeteerNode);
puppeteerExtra.use(StealthPlugin());

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getScraperType(): Promise<ScraperType> {
    return new Promise((resolve) => {
        rl.question('Choose scraper (youtube/g2): ', (type) => {
            rl.close();
            resolve(type as ScraperType);
        });
    });
}

async function main() {
    const scraperType = await getScraperType();
    
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
        
        switch(scraperType) {
            case 'youtube':
                await getYouTubeComments(page, SCRAPER_INPUTS.youtube.videoLink);
                break;
            case 'g2':
                console.log('G2 scraper not implemented yet');
                break;
            default:
                console.log('Invalid scraper type');
        }
    } catch (error) {
        console.error('Error occurred:', error);
    } finally {
        await browser.close();
    }
}

main().catch(console.error); 