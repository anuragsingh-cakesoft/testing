import {
    YouTubeVideoSearchExecutionData,
    YouTubeVideoSearchExecutionParams,
    YouTubeVideoSearchNodeParams,
    YouTubeVideoSearchYieldData
} from 'plugins/YouTube';

export interface YouTubeVideo {
    something: number;
}

export type YouTubeNodeParams = YouTubeVideoSearchNodeParams;

export type YouTubeExecutionParams = YouTubeVideoSearchExecutionParams;

export type YouTubeExecutionData = YouTubeVideoSearchExecutionData;

export type YouTubeYieldData = YouTubeVideoSearchYieldData;

// =================================>

export interface YouTubeSearchParams {
    searchQuery: string;
    type?: 'All' | 'Videos' | 'Shorts' | 'Channel';
    uploadDate?: 'Any' | 'Last hour' | 'Today' | 'This week' | 'This month' | 'This year';
    sortBy?: 'Default' | 'Relevance' | 'Upload date' | 'View count' | 'Rating';
    numberOfVideos?: number;
}

export interface YouTubeSearchResult {
    youTubeVideo: any;
    youTubeChannel: any;
}
