export type ScraperType = 'youtube' | 'g2';

export const SCRAPER_INPUTS = {
    youtube: {
        videoLink: 'https://www.youtube.com/watch?v=aLJfvepNA08'
    },
    g2: {
        productLink: 'https://www.g2.com/products/some-product'
    }
} as const; 