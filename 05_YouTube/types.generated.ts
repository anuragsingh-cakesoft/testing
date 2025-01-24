
export interface YouTubeVideoSearchNodeParams {
    provider: 'YouTube';
    operation: 'VideoSearch';
    startUrls?: string[];
    searchStrings?: string[];
}

export interface YouTubeVideoSearchExecutionParams {
    provider: 'YouTube';
    operation: 'VideoSearch';
    startUrls?: string[];
    searchStrings?: string[];
}
