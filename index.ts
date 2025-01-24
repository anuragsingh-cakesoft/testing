import { PuppeteerExtra } from 'puppeteer-extra';
import puppeteer, { PuppeteerNode } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { SCRAPER_INPUTS } from './inputs.js';
import { getYouTubeComments } from './01_youtubeVideoDetails/youtubeCommentsScraper.js';
import { G2ReviewExtract } from './02_G2ReviewExtract/G2ReviewExtract.js';
import { ProductHuntCommentExtract } from './03_ProductHuntCommentExtract/ProductHuntCommentExtract.js';
import { youtubeVideoSearch } from './04_youtubeVideoSearch/youtubeVideoSearch.js';
import { videoSearch } from './06_YouTube/VideoSearch.js';
import readline from 'readline';

const puppeteerExtra = new PuppeteerExtra(puppeteer as unknown as PuppeteerNode);
puppeteerExtra.use(StealthPlugin());

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getScraperType(): Promise<string> {
    return new Promise(resolve => {
        rl.question('Choose scraper (youtube(1)/g2(2)/producthunt(3)/youtubeSearch(4)): / videoseaarch(5) ', type => {
            rl.close();
            resolve(type);
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

        switch (scraperType) {
            case '1':
                await getYouTubeComments(page, SCRAPER_INPUTS.youtube);
                break;
            case '2':
                await G2ReviewExtract(page, SCRAPER_INPUTS.g2);
                break;
            case '3':
                await ProductHuntCommentExtract(page, SCRAPER_INPUTS.producthunt);
                break;
            case '4':
                await youtubeVideoSearch(page, SCRAPER_INPUTS.youtubeSearch);
                break;
            case '5':
                await videoSearch(page);
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
