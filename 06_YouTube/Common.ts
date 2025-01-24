// import * as db from 'db';
// import { YouTubeSearchYieldData } from './Search.js';
import { YouTubeChannel, YouTubeShort, YouTubeVideo } from './types.js';
import { YouTubeSearchExecutionParams } from './types.generated.js';

export type YouTubeSearchYieldData = {
    provider: 'YouTube';
    operation: 'Search';
    videos?: YouTubeVideo[];
    channels?: YouTubeChannel[];
    shorts?: YouTubeShort[];
};

export function generateYouTubeSearchUrl(params: YouTubeSearchExecutionParams): string {
    const baseUrl = 'https://www.youtube.com/results';
    const formattedQuery = encodeURIComponent(params.searchStrings[0]).replace(/%20/g, '+');
    let url = `${baseUrl}?search_query=${formattedQuery}`;

    const SORT_CODES: Record<string, string> = {
        'Default': 'A',
        'Relevance': 'A',
        'Upload date': 'I',
        'View count': 'M',
        'Rating': 'E'
    };

    const UPLOAD_CODES_ALONE: Record<string, string> = {
        'Any': '',
        'Last hour': 'EgIIAQ%253D%253D',
        'Today': 'EgIIAg%253D%253D',
        'This week': 'EgIIAw%253D%253D',
        'This month': 'EgIIBA%253D%253D',
        'This year': 'EgIIBQ%253D%253D'
    };

    const UPLOAD_CODES_COMBO: Record<string, string> = {
        'Any': '0',
        'Last hour': 'B',
        'Today': 'C',
        'This week': 'D',
        'This month': 'E',
        'This year': 'F'
    };

    if (
        params.contentType === 'Videos' &&
        (!params.sortBy || params.sortBy === 'Default') &&
        (!params.uploadDate || params.uploadDate === 'Any')
    ) {
        return `${url}&sp=EgIQAQ%253D%253D`;
    }

    if (params.contentType === 'Channel') {
        const effectiveSortBy = params.sortBy && params.sortBy !== 'Default' ? params.sortBy : 'Default';
        const sortCode = SORT_CODES[effectiveSortBy];
        return `${url}&sp=CA${sortCode}SAhAC`;
    }

    if (params.contentType === 'Shorts') {
        return url;
    }

    const effectiveUploadDate = params.uploadDate && params.uploadDate !== 'Any' ? params.uploadDate : undefined;
    const effectiveSortBy = params.sortBy && params.sortBy !== 'Default' ? params.sortBy : undefined;

    // Case 1: Only sort_by
    if (effectiveSortBy && !effectiveUploadDate) {
        const sortCode = SORT_CODES[effectiveSortBy];
        if (sortCode) {
            url += `&sp=CA${sortCode}SAhAB`;
        }
    }

    // Case 2: Only upload_date
    else if (effectiveUploadDate && !effectiveSortBy) {
        const uploadCode = UPLOAD_CODES_ALONE[effectiveUploadDate];
        if (uploadCode) {
            url += `&sp=${uploadCode}`;
        }
    }

    // Case 3: Both sort_by and upload_date
    else if (effectiveSortBy && effectiveUploadDate) {
        const sortCode = SORT_CODES[effectiveSortBy];
        const uploadCode = UPLOAD_CODES_COMBO[effectiveUploadDate];
        if (sortCode && uploadCode) {
            const filterParam = `CAMSBAgDEAE%253D`.replace('M', sortCode).replace('D', uploadCode);
            url += `&sp=${filterParam}`;
        }
    }

    return url;
}

export function processYouTubeData(params: {
    responseData: any;
    dataType: 'initial' | 'later';
    numberOfRecordsToFetchMaxAbsolute: number;
}): YouTubeSearchYieldData {
    const { responseData, dataType, numberOfRecordsToFetchMaxAbsolute } = params;
    const videos: YouTubeVideo[] = [];
    const shorts: YouTubeShort[] = [];
    const channels: YouTubeChannel[] = [];

    const processVideoRenderer = (videoRenderer: any) => {
        const isShort = videoRenderer?.navigationEndpoint?.commandMetadata?.webPageType === 'WEB_PAGE_TYPE_SHORTS';
        if (isShort) {
            shorts.push({
                _id: videoRenderer.videoId,
                url: `https://www.youtube.com/shorts/${videoRenderer.videoId}`,
                title: videoRenderer.title.runs[0].text,
                description: videoRenderer.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((run: { text: string }) => run.text).join(''),
                youTubeChannelId: videoRenderer.ownerText.runs[0].browseEndpoint.browseId,
                raw: videoRenderer
            });
        } else {
            videos.push({
                _id: videoRenderer.videoId,
                url: `https://www.youtube.com/watch?v=${videoRenderer.videoId}`,
                title: videoRenderer.title.runs[0].text,
                description: videoRenderer.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((run: { text: string }) => run.text).join(''),
                youTubeChannelId: videoRenderer.ownerText.runs[0].navigationEndpoint.browseEndpoint.browseId,
                raw: videoRenderer
            });
        }
    };

    const processReelShelf = (reelShelf: any) => {
        if (reelShelf.items) {
            reelShelf.items.forEach((item: any) => {
                if (item.shortsLockupViewModel) {
                    shorts.push({
                        _id: item.shortsLockupViewModel.entityId.slice(-11),
                        url: `https://www.youtube.com/shorts/${item.shortsLockupViewModel.entityId.slice(-11)}`,
                        title: item.shortsLockupViewModel.accessibilityText,
                        raw: item.shortsLockupViewModel
                    });
                }
            });
        }
    };

    const processContentItem = (item: any) => {
        if (item.videoRenderer) {
            processVideoRenderer(item.videoRenderer);
        } else if (item.channelRenderer) {
            channels.push({
                _id: item.channelRenderer.channelId,
                url: `https://www.youtube.com/channel${item.channelRenderer.channelId}`,
                title: item.channelRenderer.title.simpleText,
                description: item.channelRenderer?.descriptionSnippet?.runs?.map((run: { text: string }) => run.text).join(''),
                raw: item.channelRenderer
            });
        } else if (item.reelShelfRenderer) {
            processReelShelf(item.reelShelfRenderer);
        } else if (item.shelfRenderer?.content?.items) {
            item.shelfRenderer.content.items.forEach((shelfItem: any) => {
                processContentItem(shelfItem);
            });
        }
    };

    const contents =
        dataType === 'initial'
            ? responseData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ||
              []
            : responseData?.onResponseReceivedCommands?.[0]?.appendContinuationItemsAction?.continuationItems?.[0]?.itemSectionRenderer?.contents || [];

    for (let content of contents) {
        if (videos.length + shorts.length + channels.length >= numberOfRecordsToFetchMaxAbsolute) {
            break;
        }
        if (dataType === 'initial' && content.itemSectionRenderer?.contents) {
            for (let content1 of content.itemSectionRenderer.contents) {
                if (videos.length + shorts.length + channels.length >= numberOfRecordsToFetchMaxAbsolute) {
                    break;
                }
                processContentItem(content1);
            }
        } else {
            processContentItem(content);
        }
    }

    return { provider: 'YouTube', operation: 'Search', videos, shorts, channels };
}

// export async function createYouTubeVideo(video: YouTubeVideo) {
//     const collection = await db.getCollection<YouTubeVideo>('YouTubeVideo');
//     const { upsertedCount } = await collection.updateOne({ _id: video._id }, { $set: video }, { upsert: true });
//     return { _id: video._id, created: !!upsertedCount };
// }

// export async function createYouTubeShort(short: YouTubeShort) {
//     const collection = await db.getCollection<YouTubeShort>('YouTubeShort');
//     const { upsertedCount } = await collection.updateOne({ _id: short._id }, { $set: short }, { upsert: true });
//     return { _id: short._id, created: !!upsertedCount };
// }

// export async function createYouTubeChannel(channel: YouTubeChannel) {
//     const collection = await db.getCollection<YouTubeChannel>('YouTubeChannel');
//     const { upsertedCount } = await collection.updateOne({ _id: channel._id }, { $set: channel }, { upsert: true });
//     return { _id: channel._id, created: !!upsertedCount };
// }
