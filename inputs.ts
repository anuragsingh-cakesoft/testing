// export type ScraperType = 'youtube(1)' | 'g2(2)' | 'producthunt(3)';

export const SCRAPER_INPUTS = {
    youtube: {
        youTubeVideoId: 'https://www.youtube.com/watch?v=aLJfvepNA08',
        numberOfComments: 100,
        shallExtractReplies: true
    },
    g2: {
        g2Url: 'https://www.g2.com/products/dripify/reviews',
        numberOfReviews: 100
    },
    producthunt: {
        productHuntLaunchUrl: 'https://www.producthunt.com/products/notion/reviews',
        numberOfComments: 100
    },
    youtubeSearch: {
        searchQuery: 'Dripify',
        type: 'All',
        uploadDate: 'Any',
        sortBy: 'Default',
        numberOfVideos: 100
    }
} as const;

export const capterra = {
    url: 'https://www.capterra.in/reviews/186596/notion',
    numberOfReviews: 125 // User can specify how many reviews they want to scrape
} as const;

export const trustpilot = {
    url: 'https://www.trustpilot.com/review/notion.so',
    numberOfReviews: 100 // User can specify how many reviews they want to scrape
} as const;
