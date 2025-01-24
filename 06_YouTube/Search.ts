// import * as cheerio from 'cheerio';
// import * as utils from 'utils';
// import { memoize } from 'aHelper';
// import { FieldsSpecs, impliedOneByOne, InterfaceSpecs, req } from 'generic';
// import { Context, NodeInfo, PrepareParams, PrepareResult, YieldParams, YieldResult } from 'node';
// import {
//     createYouTubeChannel,
//     createYouTubeShort,
//     createYouTubeVideo,
//     generateYouTubeSearchUrl,
//     processYouTubeData,
//     YouTubeChannel,
//     YouTubeSearchExecutionParams,
//     YouTubeShort,
//     YouTubeVideo
// } from 'plugins/YouTube';

// const URLS = {
//     initialResults: 'results?search_query=',
//     laterResults: 'search?prettyPrint=false'
// };

// // expose
// export const YouTubeSearchNodeInfo: NodeInfo = {
//     provider: 'YouTube',
//     operation: 'Search',
//     description: 'Search on YouTube.',
//     needsWebBrowser: true,
//     nodeType: 'DataSource',
//     input: [],
//     output: ['YouTubeVideo', 'YouTubeShort', 'YouTubeChannel']
// };

// export const YouTubeSearchNodeParamsFields = memoize(
//     () =>
//         ({
//             provider: {
//                 id: 'provider',
//                 label: 'Provider',
//                 type: 'CONSTANT',
//                 defaultValue: 'YouTube'
//             },
//             operation: {
//                 id: 'operation',
//                 label: 'Operation',
//                 type: 'CONSTANT',
//                 defaultValue: 'Search'
//             },
//             searchStrings: {
//                 id: 'searchStrings',
//                 label: 'Search string(s)',
//                 type: 'TEXT',
//                 multiple: true
//             },
//             uploadDate: {
//                 id: 'uploadDate',
//                 label: 'Upload Date',
//                 type: 'DROPDOWN',
//                 options: ['Any', 'Last hour', 'Today', 'This week', 'This month', 'This year']
//             },
//             sortBy: {
//                 id: 'sortBy',
//                 label: 'Sort By',
//                 type: 'DROPDOWN',
//                 options: ['Default', 'Relevance', 'Upload date', 'View count', 'Rating']
//             },
//             contentType: {
//                 id: 'contentType',
//                 label: 'Content Type',
//                 type: 'DROPDOWN',
//                 options: ['All', 'Shorts', 'Videos', 'Channel', 'Videos and Shorts']
//             }
//         } as const satisfies FieldsSpecs)
// );

// export const YouTubeSearchNodeParamsInterface = memoize(
//     () =>
//         [
//             req(YouTubeSearchNodeParamsFields().provider),
//             req(YouTubeSearchNodeParamsFields().operation),
//             impliedOneByOne(req(YouTubeSearchNodeParamsFields().searchStrings)),
//             YouTubeSearchNodeParamsFields().uploadDate,
//             YouTubeSearchNodeParamsFields().sortBy,
//             YouTubeSearchNodeParamsFields().contentType
//         ] as const satisfies InterfaceSpecs
// );

// export const YouTubeSearchExecutionParamsInterface = memoize(
//     () =>
//         [
//             req(YouTubeSearchNodeParamsFields().provider),
//             req(YouTubeSearchNodeParamsFields().operation),
//             req(YouTubeSearchNodeParamsFields().searchStrings),
//             YouTubeSearchNodeParamsFields().uploadDate,
//             YouTubeSearchNodeParamsFields().sortBy,
//             YouTubeSearchNodeParamsFields().contentType
//         ] as const satisfies InterfaceSpecs
// );

// export type YouTubeSearchExecutionData = {
//     provider: 'YouTube';
//     operation: 'Search';
//     recordsCrawled: number;
//     recordsCreated: number;
//     recordsUpdated: number;
// };

// export type YouTubeSearchYieldData = {
//     provider: 'YouTube';
//     operation: 'Search';
//     videos?: YouTubeVideo[];
//     channels?: YouTubeChannel[];
//     shorts?: YouTubeShort[];
// };

// export async function YouTubeSearchPrepare(params: PrepareParams): Promise<PrepareResult> {
//     const { execution } = params;

//     execution.data = {
//         provider: 'YouTube',
//         operation: 'Search',
//         recordsCrawled: 0,
//         recordsCreated: 0,
//         recordsUpdated: 0
//     };

//     return { startExecution: true };
// }

// export async function YouTubeSearchNavigateToStartUrl(context: Context): Promise<boolean> {
//     await context.log('Navigating to Url');

//     const params = context.execution.params as YouTubeSearchExecutionParams;
//     const startUrl = generateYouTubeSearchUrl(params);

//     context.networkInterceptor.setUrlsForListening([
//         { url: URLS.initialResults, type: 'text' },
//         { url: URLS.laterResults, type: 'json' }
//     ]);

//     context.networkInterceptor.startListening();

//     await context.page.gotoUrl(startUrl);

//     return true;
// }

// export async function YouTubeSearchRun(context: Context): Promise<void> {
//     await context.log('Search Started');
//     const params = context.execution.params as YouTubeSearchExecutionParams;
//     let { numberOfRecordsToFetchMaxAbsolute, numberOfRecordsToFetchMaxRecommended } =
//         context.execution.dataSourceParams!;
//     let scrollToBottom = false;

//     if (params.contentType == 'Shorts') {
//         await utils.general.wait(2000, 3000);
//         await context.page.waitForAndClick('div#chip-container', 1);
//     } else {
//         const initialResponse = await context.networkInterceptor.getResponses(URLS.initialResults, { minResponses: 1 });
//         const $ = cheerio.load(initialResponse[0]);
//         const scripts = $('script').toArray();
//         for (const script of scripts) {
//             const content = $(script).html();
//             if (content && content.includes('ytInitialData')) {
//                 const dataMatch = content.match(/var ytInitialData = (.+);/);
//                 if (dataMatch && dataMatch[1]) {
//                     const data = processYouTubeData({
//                         responseData: JSON.parse(dataMatch[1]),
//                         dataType: 'initial',
//                         numberOfRecordsToFetchMaxAbsolute
//                     });
//                     numberOfRecordsToFetchMaxAbsolute -=
//                         (data.videos?.length || 0) + (data.shorts?.length || 0) + (data.channels?.length || 0);
//                     numberOfRecordsToFetchMaxRecommended -=
//                         (data.videos?.length || 0) + (data.shorts?.length || 0) + (data.channels?.length || 0);
//                     await context.yield(data);
//                 }
//                 break;
//             }
//         }
//         scrollToBottom = true;
//     }

//     let previousResponses = 0;
//     while (numberOfRecordsToFetchMaxRecommended > 0) {
//         await utils.general.wait(1000);
//         if (scrollToBottom) {
//             await context.page.scrollToBottom();
//         }
//         scrollToBottom = true;
//         const laterResponse = await context.networkInterceptor.getResponses(URLS.laterResults, {
//             minResponses: previousResponses + 1
//         });
//         const data: YouTubeSearchYieldData = processYouTubeData({
//             responseData: laterResponse.slice(previousResponses),
//             dataType: 'later',
//             numberOfRecordsToFetchMaxAbsolute
//         });
//         numberOfRecordsToFetchMaxAbsolute -=
//             (data.videos?.length || 0) + (data.shorts?.length || 0) + (data.channels?.length || 0);
//         numberOfRecordsToFetchMaxRecommended -=
//             (data.videos?.length || 0) + (data.shorts?.length || 0) + (data.channels?.length || 0);
//         await context.yield(data);
//         previousResponses = laterResponse.length;
//     }

//     await context.log(`End of search`);
// }

// export async function YouTubeSearchYield(params: YieldParams): Promise<YieldResult> {
//     const { execution } = params;
//     const yieldData = params.data as YouTubeSearchYieldData;
//     const { videos: youTubeVideos, shorts: youTubeShorts, channels: youTubeChannels } = yieldData;
//     const executionData = execution.data as YouTubeSearchExecutionData;

//     for (const youTubeVideo of youTubeVideos || []) {
//         const { created } = await createYouTubeVideo(youTubeVideo);
//         executionData.recordsCrawled++;
//         if (created) {
//             executionData.recordsCreated++;
//         } else {
//             executionData.recordsUpdated++;
//         }
//     }

//     for (const youTubeShort of youTubeShorts || []) {
//         const { created } = await createYouTubeShort(youTubeShort);
//         executionData.recordsCrawled++;
//         if (created) {
//             executionData.recordsCreated++;
//         } else {
//             executionData.recordsUpdated++;
//         }
//     }

//     for (const youTubeChannel of youTubeChannels || []) {
//         const { created } = await createYouTubeChannel(youTubeChannel);
//         executionData.recordsCrawled++;
//         if (created) {
//             executionData.recordsCreated++;
//         } else {
//             executionData.recordsUpdated++;
//         }
//     }

//     return {
//         activities: [
//             {
//                 description: `Found ${youTubeVideos?.length || 0} videos, ${youTubeShorts?.length || 0} shorts, and ${
//                     youTubeChannels?.length || 0
//                 } channels.`
//             }
//         ],
//         dataSourceResult: {
//             numberOfRecordsFetched:
//                 (youTubeVideos?.length || 0) + (youTubeShorts?.length || 0) + (youTubeChannels?.length || 0)
//         }
//     };
// }
