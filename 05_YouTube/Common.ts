//import { YouTubeVideo } from 'plugins/YouTube';
// ==============================
import { YouTubeVideo, YouTubeSearchParams } from './types';
// ==============================
export async function createVideo(params: { youTubeVideo: YouTubeVideo }) {
    // some code here
    return { _id: '0', created: true };
}
// ==============================
// Add new utility functions
export function findObjectsByKey(obj: any, targetKey: string): any[] {
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

// Define types
type UploadDate = 'Any' | 'Last hour' | 'Today' | 'This week' | 'This month' | 'This year';
type SortBy = 'Default' | 'Relevance' | 'Upload date' | 'View count' | 'Rating';
type ContentType = 'All' | 'Shorts' | 'Videos' | 'Channel';

interface YouTubeSearchParams {
    searchQuery: string;
    type?: ContentType;
    uploadDate?: UploadDate;
    sortBy?: SortBy;
    numberOfVideos?: number;
}

// Mapping for sort_by values
const SORT_CODES: Record<SortBy, string> = {
    'Default' : 'A',
    'Relevance': 'A',
    'Upload date': 'I',
    'View count': 'M',
    'Rating': 'E'
};

// Mapping for upload_date values when used alone
const UPLOAD_CODES_ALONE: Record<UploadDate, string> = {
    'Any' : '',
    'Last hour': 'EgIIAQ%253D%253D',
    'Today': 'EgIIAg%253D%253D',
    'This week': 'EgIIAw%253D%253D',
    'This month': 'EgIIBA%253D%253D',
    'This year': 'EgIIBQ%253D%253D'
};

// Mapping for upload_date values when used in combination
const UPLOAD_CODES_COMBO: Record<UploadDate, string> = {
    'Any':'0',
    'Last hour': 'B',
    'Today': 'C',
    'This week': 'D',
    'This month': 'E',
    'This year': 'F'
};

export function generateYoutubeSearchUrl(params: YouTubeSearchParams): string {
    const baseUrl = 'https://www.youtube.com/results';
    const formattedQuery = encodeURIComponent(params.searchQuery).replace(/%20/g, '+');
    let url = `${baseUrl}?search_query=${formattedQuery}`;

    //here
    if (params.type === 'Videos' && 
        (!params.sortBy || params.sortBy === 'Default') && 
        (!params.uploadDate || params.uploadDate === 'Any')) {
        return `${url}&sp=EgIQAQ%253D%253D`;
    }

    // Handle Channel type specifically
    if (params.type === 'Channel') {
        const effectiveSortBy = params.sortBy && params.sortBy !== 'Default' ? params.sortBy : 'Default';
        const sortCode = SORT_CODES[effectiveSortBy];
        return `${url}&sp=CA${sortCode}SAhAC`;
    }

    // Early return for Shorts
    if (params.type === 'Shorts') {
        return url;
    }

    // Rest of the logic for other types
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
            const filterParam = `CAMSBAgDEAE%253D`
                .replace('M', sortCode)
                .replace('D', uploadCode);
            url += `&sp=${filterParam}`;
        }
    }
    
    return url;
}
