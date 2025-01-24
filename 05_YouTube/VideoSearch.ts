import * as utils from 'utils';
import { memoize } from 'aHelper';
import { FieldsSpecs, impliedOneByOne, InterfaceSpecs, req } from 'generic';
import { Context, NodeInfo, PrepareParams, PrepareResult, YieldParams, YieldResult } from 'node';
import { createVideo, findObjectsByKey } from './Common';
import { YouTubeVideo, YouTubeSearchResult } from './types';
import * as cheerio from 'cheerio';

// Comment out original URLS
/*const URLS = {
    SEARCH_HIT_URL1: 'someurl',
    SEARCH_HIT_URL2: 'someotherurl'
};*/

// expose
export const YouTubeVideoSearchNodeInfo: NodeInfo = {
    provider: 'YouTube',
    operation: 'VideoSearch',
    description: 'Search on YouTube.',
    needsWebBrowser: true,
    nodeType: 'DataSource',
    input: [],
    output: ['Video']
};

export const YouTubeVideoSearchNodeParamsFields = memoize(
    () =>
        ({
            provider: {
                id: 'provider',
                label: 'Provider',
                type: 'CONSTANT',
                defaultValue: 'YouTube'
            },
            operation: {
                id: 'operation',
                label: 'Operation',
                type: 'CONSTANT',
                defaultValue: 'VideoSearch'
            },
            startUrls: {
                id: 'startUrls',
                label: 'Start URL(s)',
                type: 'TEXT',
                multiple: true
            },
            searchStrings: {
                id: 'searchStrings',
                label: 'Search string(s)',
                type: 'TEXT',
                multiple: true
            }
        } as const satisfies FieldsSpecs)
);

export const YouTubeVideoSearchNodeParamsInterface = memoize(
    () =>
        [
            req(YouTubeVideoSearchNodeParamsFields().provider),
            req(YouTubeVideoSearchNodeParamsFields().operation),
            impliedOneByOne(YouTubeVideoSearchNodeParamsFields().startUrls),
            impliedOneByOne(YouTubeVideoSearchNodeParamsFields().searchStrings)
        ] as const satisfies InterfaceSpecs
);

export const YouTubeVideoSearchExecutionParamsInterface = memoize(
    () =>
        [
            req(YouTubeVideoSearchNodeParamsFields().provider),
            req(YouTubeVideoSearchNodeParamsFields().operation),
            YouTubeVideoSearchNodeParamsFields().startUrls,
            YouTubeVideoSearchNodeParamsFields().searchStrings
        ] as const satisfies InterfaceSpecs
);

export type YouTubeVideoSearchExecutionData = {
    provider: 'YouTube';
    operation: 'VideoSearch';
    videosCrawled: number;
    videosCreated: number;
    videosUpdated: number;
};

export type YouTubeVideoSearchYieldData = {
    provider: 'YouTube';
    operation: 'VideoSearch';
    videos?: YouTubeVideo[];
};

export async function YouTubeVideoSearchPrepare(params: PrepareParams): Promise<PrepareResult> {
    const { execution } = params;

    execution.data = {
        provider: 'YouTube',
        operation: 'VideoSearch',
        videosCrawled: 0,
        videosCreated: 0,
        videosUpdated: 0
    };

    return { startExecution: true };
}

export async function YouTubeVideoSearchNavigateToStartUrl(context: Context): Promise<boolean> {
    await context.log('Video Search Started');

    const params = context.execution.params as YouTubeVideoSearchExecutionParams;
    let { nextPageRef } = context.execution.dataSourceParams!;

    let startUrl: string;
    if (nextPageRef) {
        startUrl = nextPageRef;
    } else if (params.startUrls?.length) {
        startUrl = params.startUrls[0];
    } else {
        startUrl = 'https://youtube.com/search';
    }

    context.networkInterceptor.setUrlsForListening([{ url: URLS.SEARCH_HIT_URL1 }, { url: URLS.SEARCH_HIT_URL2 }]);

    const tempUrl = new URL(startUrl);
    tempUrl.searchParams.set('origin', 'FACETED_SEARCH');

    await context.page.gotoUrl(tempUrl.toString());

    return true;
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

export async function YouTubeVideoSearchRun(context: Context): Promise<void> {
    const params = context.execution.params as YouTubeVideoSearchExecutionParams;
    let initialData: any = null;
    let laterData: any[] = [];

    const responseListener = async (response: any) => {
        const url = response.url();
        try {
            if (url.includes('results?search_query=')) {
                const html = await response.text();
                const $ = cheerio.load(html);
                const scripts = $('script').toArray();
                for (const script of scripts) {
                    const content = $(script).html();
                    if (content && content.includes('ytInitialData')) {
                        const dataMatch = content.match(/var ytInitialData = (.+);/);
                        if (dataMatch && dataMatch[1]) {
                            initialData = JSON.parse(dataMatch[1]);
                            break;
                        }
                    }
                }
            } else if (url.includes('search?prettyPrint=false')) {
                const responseData = await response.json();
                laterData.push(responseData);
            }
        } catch (error) {
            console.error('Error in response listener:', error);
        }
    };

    context.page.on('response', responseListener);

    // Navigate and scroll
    await context.page.goto(context.url);
    await context.page.waitForSelector('div#contents');

    const numberOfScrolls = Math.ceil(20); // Adjust based on needs
    for (let i = 0; i < numberOfScrolls; i++) {
        await context.page.evaluate(() => {
            window.scrollTo(0, document.documentElement.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    context.page.off('response', responseListener);

    // Process and store data
    if (initialData) {
        context.execution.data = {
            initialData: processInitialData(initialData),
            laterData: laterData.map(data => processLaterData(data))
        };
    }
}

export async function YouTubeVideoSearchYield(params: YieldParams): Promise<YieldResult> {
    const { execution } = params;
    const executionData = execution.data as YouTubeVideoSearchExecutionData;
    
    let totalVideos = 0;
    let totalShorts = 0;
    let totalChannels = 0;

    // Process initial data
    if (executionData.initialData) {
        totalVideos += executionData.initialData.videos.length;
        totalShorts += executionData.initialData.shorts.length;
        totalChannels += executionData.initialData.channels.length;

        // Create videos
        for (const video of executionData.initialData.videos) {
            await createVideo({ youTubeVideo: video.youTubeVideo });
        }
    }

    // Process later data
    if (executionData.laterData) {
        for (const data of executionData.laterData) {
            totalVideos += data.videos.length;
            totalShorts += data.shorts.length;
            totalChannels += data.channels.length;

            // Create videos
            for (const video of data.videos) {
                await createVideo({ youTubeVideo: video.youTubeVideo });
            }
        }
    }

    return {
        activities: [
            {
                description: `Found ${totalVideos} videos, ${totalShorts} shorts, and ${totalChannels} channels.`
            }
        ],
        dataSourceResult: { 
            numberOfRecordsFetched: totalVideos + totalShorts + totalChannels 
        }
    };
}
