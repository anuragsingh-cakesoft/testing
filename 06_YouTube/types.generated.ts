
export interface YouTubeSearchNodeParams {
    provider: 'YouTube';
    operation: 'Search';
    searchStrings: string[];
    uploadDate?: 'Any' | 'Last hour' | 'Today' | 'This week' | 'This month' | 'This year';
    sortBy?: 'Default' | 'Relevance' | 'Upload date' | 'View count' | 'Rating';
    contentType?: 'All' | 'Shorts' | 'Videos' | 'Channel' | 'Videos and Shorts';
}

export interface YouTubeSearchExecutionParams {
    provider: 'YouTube';
    operation: 'Search';
    searchStrings: string[];
    uploadDate?: 'Any' | 'Last hour' | 'Today' | 'This week' | 'This month' | 'This year';
    sortBy?: 'Default' | 'Relevance' | 'Upload date' | 'View count' | 'Rating';
    contentType?: 'All' | 'Shorts' | 'Videos' | 'Channel' | 'Videos and Shorts';
}
