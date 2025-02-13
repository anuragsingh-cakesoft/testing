import { Page } from 'puppeteer';
import { promises as fs } from 'fs';
import * as cheerio from 'cheerio';

async function extractInitialReviews(html: string): Promise<any[]> {
    const $ = cheerio.load(html);
    const reviews: any[] = [];

    // Find the script containing the initial reviews data
    const scriptContent = $('script[type="application/ld+json"][data-business-unit-json-ld="true"]').text();
    if (!scriptContent) return reviews;

    try {
        const jsonData = JSON.parse(scriptContent);
        const reviewsData = jsonData['@graph'].filter(
            (item: any) => item['@type'] === 'Review' && item['@id']?.includes('/schema/Review/notion.so/')
        );
        reviews.push(...reviewsData);
    } catch (error) {
        console.error('Error parsing initial reviews:', error);
    }

    return reviews;
}

export async function TrustPilotExtract(
    page: Page,
    trustpilot: { url: string; numberOfReviews: number }
): Promise<void> {
    try {
        // Navigate to first page and wait for content
        await page.goto(trustpilot.url, { waitUntil: 'networkidle0' });
        await page.waitForSelector('script[type="application/ld+json"][data-business-unit-json-ld="true"]');

        const html = await page.content();
        const $ = cheerio.load(html);
        const lastPageButton = $('a[name="pagination-button-last"]').text().trim();
        const totalAvailablePages = parseInt(lastPageButton) || 1;

        const REVIEWS_PER_PAGE = 20;
        const totalAvailableReviews = totalAvailablePages * REVIEWS_PER_PAGE;
        const reviewsToScrape = Math.min(trustpilot.numberOfReviews, totalAvailableReviews);
        const pagesToScrape = Math.ceil(reviewsToScrape / REVIEWS_PER_PAGE);

        console.log(`Total available pages: ${totalAvailablePages}`);
        console.log(`Will scrape approximately ${reviewsToScrape} reviews (${pagesToScrape} pages)`);

        let allReviews: any[] = [];

        for (let currentPage = 1; currentPage <= pagesToScrape; currentPage++) {
            const pageUrl = currentPage === 1 ? trustpilot.url : `${trustpilot.url}?page=${currentPage}`;
            console.log(`Scraping page ${currentPage}/${pagesToScrape}: ${pageUrl}`);

            // Wait for page load and script content
            await page.goto(pageUrl, { waitUntil: 'networkidle0' });
            await page.waitForSelector('script[type="application/ld+json"][data-business-unit-json-ld="true"]');

            const pageHtml = await page.content();
            const pageReviews = await extractInitialReviews(pageHtml);
            console.log(`Found ${pageReviews.length} reviews on page ${currentPage}`);
            allReviews.push(...pageReviews);

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const output = {
            productUrl: trustpilot.url,
            totalReviews: allReviews.length,
            reviews: allReviews.slice(0, reviewsToScrape)
        };

        await fs.mkdir('./10_Trustpilot/outputs', { recursive: true });
        await fs.writeFile('./10_Trustpilot/outputs/trustpilot_reviews.json', JSON.stringify(output, null, 2));

        console.log(
            `Successfully extracted ${output.reviews.length} reviews out of ${totalAvailableReviews} total reviews`
        );
    } catch (error) {
        console.error('Error in TrustPilot extraction:', error);
    }
}
