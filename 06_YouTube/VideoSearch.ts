import { promises as fs } from 'fs';
import * as cheerio from 'cheerio';
import { generateYouTubeSearchUrl, processYouTubeData } from './Common.js';
import { Page } from 'puppeteer';

export async function videoSearch(page: Page) {
    try {
        // Generate search URL using Common.ts function
        const searchUrl = generateYouTubeSearchUrl({
            provider: 'YouTube',
            operation: 'Search',
            searchStrings: ['music shorts'],
            contentType: 'All',
            uploadDate: 'Any',
            sortBy: 'Default'
        });

        let initialData: any = null;
        let laterResponses: any[] = [];

        // Monitor network requests
        page.on('response', async (response) => {
            const url = response.url();
            try {
                if (url.includes('results?search_query=')) {
                    const html = await response.text();
                    const $ = cheerio.load(html);
                    const scripts = $('script').toArray();
                    for (const script of scripts) {
                        const content = $(script).html();
                        if (content?.includes('var ytInitialData = ')) {
                            const dataMatch = content.match(/var ytInitialData = (.+);/);
                            if (dataMatch?.[1]) {
                                initialData = JSON.parse(dataMatch[1]);
                                break;
                            }
                        }
                    }
                } else if (url.includes('search?prettyPrint=false')) {
                    const jsonData = await response.json();
                    laterResponses.push(jsonData);
                }
            } catch (error) {
                console.error('Response handling error:', error);
            }
        });

        // Navigate to search URL
        await page.goto(searchUrl);
        await page.waitForSelector('div#contents');

        // Scroll specified number of times
        const numberOfScrolls = 12;
        for (let i = 0; i < numberOfScrolls; i++) {
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            console.log(`Scroll ${i + 1}/${numberOfScrolls}`);
            await new Promise(r => setTimeout(r, 2000));
        }

        // Process data using Common.ts function
        const processedInitialData = processYouTubeData({
            responseData: initialData,
            dataType: 'initial',
            numberOfRecordsToFetchMaxAbsolute: 1000
        });

        console.log(laterResponses)

        const processedLaterData = laterResponses.map(response =>
            processYouTubeData({
                responseData: response,
                dataType: 'later',
                numberOfRecordsToFetchMaxAbsolute: 1000
            })
        );

        // Combine results
        const finalResults = {
            videos: [...(processedInitialData.videos || [])],
            shorts: [...(processedInitialData.shorts || [])],
            channels: [...(processedInitialData.channels || [])]
        };

        processedLaterData.forEach(data => {
            finalResults.videos.push(...(data.videos || []));
            finalResults.shorts.push(...(data.shorts || []));
            finalResults.channels.push(...(data.channels || []));
        });

        // Save results
        await fs.mkdir('./outputs', { recursive: true });
        await fs.writeFile(
            './outputs/final.json',
            JSON.stringify({
                searchUrl,
                results: finalResults
            }, null, 2)
        );

        console.log('Results saved to outputs/final.json');
        console.log('Counts:', {
            videos: finalResults.videos.length,
            shorts: finalResults.shorts.length,
            channels: finalResults.channels.length
        });

    } catch (error) {
        console.error('Error in YouTube video search:', error);
    }
}
