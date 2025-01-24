// import * as db from 'db';
// import {
//     YouTubeSearchExecutionData,
//     YouTubeSearchExecutionParams,
//     YouTubeSearchNodeParams,
//     YouTubeSearchYieldData
// } from '../YouTube';

export interface YouTubeVideo {
    _id: string;
    url: string;
    title?: string;
    description?: string;
    youTubeChannelId?: string;
    raw: any;
}

export interface YouTubeShort  {
    _id: string;
    url: string;
    title?: string;
    description?: string;
    youTubeChannelId?: string;
    raw: any;
}

export interface YouTubeChannel {
    _id: string;
    url: string;
    title?: string;
    description?: string;
    raw: any;
}

// export type YouTubeNodeParams = YouTubeSearchNodeParams;

// export type YouTubeExecutionParams = YouTubeSearchExecutionParams;

// export type YouTubeExecutionData = YouTubeSearchExecutionData;

// export type YouTubeYieldData = YouTubeSearchYieldData;
