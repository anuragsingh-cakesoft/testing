import { promises as fs } from 'fs';
import { Page, HTTPResponse } from 'puppeteer'; 
import * as cheerio from 'cheerio';

interface G2Person {
    name: string;
    title: string;
    industry: string;
    companySize: string;
    profileImage?: string;
}

interface G2Review {
    rating: number;
    title: string;
    content: string;
    datePosted: string;
    helpfulVotes: number;
    verificationStatus: string;
    pros: string;
    cons: string;
    dateUpdated?: string;
}

interface G2ReviewData {
    g2Review: G2Review;
    g2Person: G2Person;
}

function getTextSafely($: ReturnType<typeof cheerio.load>, selector: string, element: cheerio.Element): string {
    try {
        return $(selector, element).text().trim();
    } catch {
        return '';
    }
}

function getAttrSafely($: ReturnType<typeof cheerio.load>, selector: string, attr: string, element: cheerio.Element): string | undefined {
    try {
        return $(selector, element).attr(attr);
    } catch {
        return undefined;
    }
}

function extractReviewsFromHTML(html: string): G2ReviewData[] {
    const reviews: G2ReviewData[] = [];
    const $ = cheerio.load(html);
    
    $('.review').each((_, reviewElement) => {
        try {
            const g2Person: G2Person = {
                name: getTextSafely($, '.review__author-name', reviewElement),
                title: getTextSafely($, '.review__author-title', reviewElement),
                industry: getTextSafely($, '.review__author-industry', reviewElement),
                companySize: getTextSafely($, '.review__author-company-size', reviewElement),
                profileImage: getAttrSafely($, '.review__author-avatar img', 'src', reviewElement)
            };

            const ratingText = getTextSafely($, '.review__rating', reviewElement);
            const rating = parseInt(ratingText.split('/')[0]) || 0;

            const g2Review: G2Review = {
                rating,
                title: getTextSafely($, '.review__title', reviewElement),
                content: getTextSafely($, '.review__content', reviewElement),
                datePosted: getAttrSafely($, '.review__date', 'datetime', reviewElement) || '',
                helpfulVotes: parseInt(getTextSafely($, '.review__helpful-count', reviewElement)) || 0,
                verificationStatus: getTextSafely($, '.review__verification', reviewElement),
                pros: getTextSafely($, '.review__pros', reviewElement),
                cons: getTextSafely($, '.review__cons', reviewElement),
                dateUpdated: getAttrSafely($, '.review__date-updated', 'datetime', reviewElement)
            };

            reviews.push({ g2Review, g2Person });
        } catch (err) {
            console.error('Error parsing review:', err);
        }
    });

    return reviews;
}

export async function G2ReviewExtract(page: Page, g2: { g2Url: string, numberOfReviews: number }): Promise<void> {
    // Add anti-detection measures
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
    });

    // Add random delay between requests
    const randomDelay = (min: number, max: number) => 
        new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)));

    let allReviews: G2ReviewData[] = [];
    let totalReviews = 0;

    try {
        await page.goto(g2.g2Url, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        await randomDelay(2000, 4000);
        
        // Step 1: Get total reviews count from initial page
        await page.waitForSelector('meta[name="twitter:data1"]');
        
        totalReviews = await page.evaluate(() => {
            const reviewCountText = document.querySelector('meta[name="twitter:data1"]')?.getAttribute('value') || '';
            const match = reviewCountText.match(/Filter (\d+) reviews/);
            return match ? parseInt(match[1]) : 0;
        });

        console.log(`Total reviews to extract: ${totalReviews}`);

        // Calculate total pages
        const totalPages = Math.ceil(totalReviews / 10);
        console.log(`Total pages to process: ${totalPages}`);

        // Step 2 & 3: Extract reviews from all pages
        for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
            const pageUrl = currentPage === 1 
                ? g2.g2Url 
                : `${g2.g2Url}?page=${currentPage}`;

            console.log(`Processing page ${currentPage}/${totalPages}`);
            
            try {
                // Navigate to page and wait for content
                await page.goto(pageUrl);
                await page.waitForSelector('.review', { timeout: 10000 });
                
                // Wait for dynamic content to load
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Get page HTML and extract reviews
                const html = await page.content();
                const pageReviews = extractReviewsFromHTML(html);
                
                if (pageReviews.length > 0) {
                    allReviews.push(...pageReviews);
                    console.log(`Extracted ${pageReviews.length} reviews from page ${currentPage}`);
                } else {
                    console.warn(`No reviews found on page ${currentPage}`);
                }

                // Add delay between pages to avoid rate limiting
                await randomDelay(3000, 6000); // Random delay between pages

            } catch (err) {
                console.error(`Error processing page ${currentPage}:`, err);
                // Continue with next page even if current page fails
                continue;
            }
        }

        if (allReviews.length > 0) {
            try {
                const finalObject = {
                    productUrl: g2.g2Url,
                    totalReviews: totalReviews,
                    extractedReviews: allReviews.length,
                    reviews: allReviews
                };

                await Promise.all([
                    fs.writeFile('./outputs/g2_reviews.json', JSON.stringify(finalObject, null, 2), 'utf-8'),
                    fs.writeFile('./outputs/g2_reviews_raw.json', JSON.stringify(allReviews, null, 2), 'utf-8')
                ]);

                console.log(`Successfully extracted ${allReviews.length} reviews out of ${totalReviews} total reviews`);
            } catch (err) {
                console.error('Error saving data to file:', err);
            }
        } else {
            console.log('No reviews were captured.');
        }
    } catch (err) {
        console.error('Error accessing G2:', err);
    }
}