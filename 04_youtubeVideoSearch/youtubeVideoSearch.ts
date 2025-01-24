import { Page } from 'puppeteer';
import { promises as fs } from 'fs';
import { generateYoutubeSearchUrl } from '../urlgenerator.js';
import * as cheerio from 'cheerio';

interface YouTubeSearchResult {
    youTubeVideo: any;
    youTubeChannel: any;
}

function findObjectsByKey(obj: any, targetKey: string): any[] {
    let results: any[] = [];

    function recursiveSearch(current: any) {
        if (Array.isArray(current)) {
            current.forEach(item => recursiveSearch(item));
        } else if (current && typeof current === 'object') {
            if (targetKey in current) {
                results.push(current[targetKey]);
            }
            Object.values(current).forEach(value => recursiveSearch(value));
        }
    }

    recursiveSearch(obj);
    return results;
}

function processInitialData(responseData: any): {
    videos: YouTubeSearchResult[];
    shorts: YouTubeSearchResult[];
    channels: YouTubeSearchResult[];
} {
    const videos: YouTubeSearchResult[] = [];
    const shorts: YouTubeSearchResult[] = [];
    const channels: YouTubeSearchResult[] = [];

    // Helper function to process video renderers
    const processVideoRenderer = (videoRenderer: any) => {
        const isShort = videoRenderer?.navigationEndpoint?.commandMetadata?.webPageType === "WEB_PAGE_TYPE_SHORTS";
        if (isShort) {
            shorts.push({
                youTubeVideo: videoRenderer,
                youTubeChannel: videoRenderer.ownerText || {}
            });
        } else {
            videos.push({
                youTubeVideo: videoRenderer,
                youTubeChannel: videoRenderer.ownerText || {}
            });
        }
    };

    // Helper function to process reel shelf
    const processReelShelf = (reelShelf: any) => {
        if (reelShelf.items) {
            reelShelf.items.forEach((item: any) => {
                if (item.shortsLockupViewModel) {
                    shorts.push({
                        youTubeVideo: item,
                        youTubeChannel: ''
                    });
                }
            });
        }
    };

    // Helper function to process content items
    const processContentItem = (item: any) => {
        if (item.videoRenderer) {
            processVideoRenderer(item.videoRenderer);
        }
        else if (item.channelRenderer) {
            channels.push({
                youTubeVideo: '',
                youTubeChannel: item.channelRenderer
            });
        }
        else if (item.reelShelfRenderer) {
            processReelShelf(item.reelShelfRenderer);
        }
        else if (item.shelfRenderer?.content?.items) {
            // Process items inside shelf
            item.shelfRenderer.content.items.forEach((shelfItem: any) => {
                processContentItem(shelfItem);
            });
        }
    };

    // Navigate to the main contents array
    const mainContents = responseData?.contents
        ?.twoColumnSearchResultsRenderer
        ?.primaryContents
        ?.sectionListRenderer
        ?.contents || [];

    // Process each item in the main contents
    mainContents.forEach((section: any) => {
        if (section.itemSectionRenderer?.contents) {
            section.itemSectionRenderer.contents.forEach((item: any) => {
                processContentItem(item);
            });
        }
    });

    return { videos, shorts, channels };
}

function processLaterData(responseData: any): {
    videos: YouTubeSearchResult[];
    shorts: YouTubeSearchResult[];
    channels: YouTubeSearchResult[];
} {
    const videos: YouTubeSearchResult[] = [];
    const shorts: YouTubeSearchResult[] = [];
    const channels: YouTubeSearchResult[] = [];

    const continuationItems = responseData?.onResponseReceivedCommands?.[0]
        ?.appendContinuationItemsAction?.continuationItems?.[0]
        ?.itemSectionRenderer?.contents || [];

    continuationItems.forEach((item: any) => {
        if (item.videoRenderer) {
            const isShort = item.videoRenderer?.navigationEndpoint?.commandMetadata?.webPageType === "WEB_PAGE_TYPE_SHORTS";
            if (isShort) {
                shorts.push({
                    youTubeVideo: item.videoRenderer,
                    youTubeChannel: item.videoRenderer.ownerText || {}
                });
            } else {
                videos.push({
                    youTubeVideo: item.videoRenderer,
                    youTubeChannel: item.videoRenderer.ownerText || {}
                });
            }
        } 
        else if (item.channelRenderer) {
            channels.push({
                youTubeVideo: '',
                youTubeChannel: item.channelRenderer
            });
        }
    });

    return { videos, shorts, channels };
}

export async function youtubeVideoSearch(page: Page, youtubeSearch: any): Promise<void> {
    try {
        const searchUrl = generateYoutubeSearchUrl({
            searchQuery: youtubeSearch.searchQuery,
            type: youtubeSearch.type,
            uploadDate: youtubeSearch.uploadDate,
            sortBy: youtubeSearch.sortBy,
            numberOfVideos: youtubeSearch.numberOfVideos
        });

        let initialData: any = null;
        let laterData: any[] = [];

        // Set up network listener for both initial and scroll data
        const responseListener = async (response: any) => {
            const url = response.url();
            try {
                if (url.includes('results?search_query=')) {
                    const html = await response.text();
                    const $ = cheerio.load(html);
                    // Find the script containing the initial data
                    const scripts = $('script').toArray();
                    for (const script of scripts) {
                        const content = $(script).html();
                        if (content && content.includes('ytInitialData')) {
                            const dataMatch = content.match(/var ytInitialData = (.+);/);
                            if (dataMatch && dataMatch[1]) {
                                initialData = JSON.parse(dataMatch[1]);
                                // Process and save initial data
                                const processedInitialData = processInitialData(initialData);
                                await fs.writeFile(
                                    './04_youtubeVideoSearch/outputs/initial_data.json',
                                    JSON.stringify({
                                        searchQuery: youtubeSearch.searchQuery,
                                        searchUrl,
                                        results: processedInitialData
                                    }, null, 2)
                                );
                                console.log('Initial data processed:', {
                                    videos: processedInitialData.videos.length,
                                    shorts: processedInitialData.shorts.length,
                                    channels: processedInitialData.channels.length
                                });
                                break;
                            }
                        }
                    }
                } else if (url.includes('search?prettyPrint=false')) {
                    const responseData = await response.json();
                    laterData.push(responseData);
                    
                    // Process and save later data using the new function
                    await fs.writeFile(
                        './04_youtubeVideoSearch/outputs/later_data.json',
                        JSON.stringify(laterData.map(data => processLaterData(data)), null, 2)
                    );

                    const processedData = processLaterData(responseData);
                    console.log(`Processed scroll data #${laterData.length}:`, {
                        videos: processedData.videos.length,
                        shorts: processedData.shorts.length,
                        channels: processedData.channels.length
                    });
                }
            } catch (error) {
                console.error('Error in response listener:', error);
            }
        };

        page.on('response', responseListener);

        // Navigate to search URL
        await page.goto(searchUrl);
        await page.waitForSelector('div#contents');

        // Scroll function
        const scrollToBottom = async () => {
            await page.evaluate(() => {
                window.scrollTo(0, document.documentElement.scrollHeight);
            });
        };

        // Scroll multiple times with delay
        const numberOfScrolls = Math.ceil(youtubeSearch.numberOfVideos / 20); // Approximately 20 videos per scroll
        for (let i = 0; i < numberOfScrolls; i++) {
            await scrollToBottom();
            console.log(`Scroll ${i + 1}/${numberOfScrolls} completed`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        }

        // Final wait to ensure all data is captured
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Remove listener
        page.off('response', responseListener);

        if (initialData) {
            const processedInitialData = processInitialData(initialData);
            const allProcessedLaterData = laterData.map(data => processLaterData(data));
            
            // Combine all results
            const combinedResults = {
                videos: [...processedInitialData.videos],
                shorts: [...processedInitialData.shorts],
                channels: [...processedInitialData.channels]
            };

            // Add results from later data
            allProcessedLaterData.forEach(data => {
                combinedResults.videos.push(...data.videos);
                combinedResults.shorts.push(...data.shorts);
                combinedResults.channels.push(...data.channels);
            });

            // Save only the final combined results
            await fs.writeFile(
                './04_youtubeVideoSearch/outputs/final_data.json',
                JSON.stringify({
                    searchQuery: youtubeSearch.searchQuery,
                    searchUrl,
                    results: combinedResults
                }, null, 2)
            );

            console.log('All data saved successfully');
            console.log('Final counts:', {
                videos: combinedResults.videos.length,
                shorts: combinedResults.shorts.length,
                channels: combinedResults.channels.length
            });
        }

    } catch (error) {
        console.error('Error in YouTube video search:', error);
    }
}
