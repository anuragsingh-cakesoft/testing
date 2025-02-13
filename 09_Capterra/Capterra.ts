import { Page } from 'puppeteer';
import { promises as fs } from 'fs';
import * as cheerio from 'cheerio';

interface CapterraReview {
    author: {
        name: string;
        role?: string;
        employeeCount?: string;
        usageDuration?: string;
    };
    rating: number;
    datePublished: string;
    reviewContent: {
        title?: string;
        comments?: string;
        pros?: string;
        cons?: string;
    };
    verifiedStatus: boolean;
}

interface CapterraOutput {
    productUrl: string;
    totalReviews: number;
    reviews: CapterraReview[];
}

async function extractReviewsFromPage(html: string): Promise<CapterraReview[]> {
    const $ = cheerio.load(html);
    const reviews: CapterraReview[] = [];

    // Find all review cards
    $('.i18n-translation_container.pt-4.py-3.py-md-5.review-card').each((_, element) => {
        const $review = $(element);

        // Extract author info from the first column
        const authorName = $review.find('.col.ps-0 .h5.fw-bold').text().trim();
        const authorRole = $review.find('.col.ps-0 .text-ash').text().trim();

        // Extract company details
        const companyDetails = $review
            .find('.col-12.col-md-6.col-lg-12.pt-3.pt-md-0.pt-lg-3.text-ash .mb-2')
            .map((_, el) => $(el).text().trim())
            .get();

        const [employeeInfo, usageDuration] = companyDetails;

        // Extract rating
        const ratingText = $review.find('.stars-wrapper + .ms-1').text().trim();
        const rating = parseFloat(ratingText) || 0;

        // Extract date
        const datePublished = $review.find('.text-ash.mb-3 .ms-2').first().text().trim();

        // Extract review content
        const title = $review.find('h3.h5.fw-bold').text().trim();

        // Extract comments, pros, and cons
        const comments = $review.find('span.fw-bold:contains("Comments:") + span').text().trim();
        const pros = $review.find('svg.icon-plus-circle').parent().next('p').text().trim();
        const cons = $review.find('svg.icon-minus-circle').parent().next('p').text().trim();

        // Check for verified status badge
        const verifiedStatus = $review.find('.badge.bg-honeydew.text-kale').length > 0;

        // Create review object
        const review: CapterraReview = {
            author: {
                name: authorName,
                role: authorRole || undefined,
                employeeCount: employeeInfo || undefined,
                usageDuration: usageDuration || undefined
            },
            rating,
            datePublished,
            reviewContent: {
                title: title || undefined,
                comments: comments || undefined,
                pros: pros || undefined,
                cons: cons || undefined
            },
            verifiedStatus
        };

        reviews.push(review);
    });

    return reviews;
}

export async function CapterraExtract(page: Page, capterra: { url: string; numberOfReviews: number }): Promise<void> {
    try {
        // Navigate to first page
        await page.goto(capterra.url);

        // Get total number of pages from pagination
        const html = await page.content();
        const $ = cheerio.load(html);
        const paginationItems = $('.pagination .page-item');
        const totalAvailablePages =
            paginationItems.length > 0 ? parseInt(paginationItems.last().prev().text().trim()) : 1;

        const REVIEWS_PER_PAGE = 25;
        const totalAvailableReviews = totalAvailablePages * REVIEWS_PER_PAGE;

        // Calculate how many pages we need to scrape based on requested reviews
        const reviewsToScrape = Math.min(capterra.numberOfReviews, totalAvailableReviews);
        const pagesToScrape = Math.ceil(reviewsToScrape / REVIEWS_PER_PAGE);

        console.log(`Total available reviews: ${totalAvailableReviews} (${totalAvailablePages} pages)`);
        console.log(`Will scrape approximately ${reviewsToScrape} reviews (${pagesToScrape} pages)`);

        // Initialize array to store all reviews
        const allReviews: CapterraReview[] = [];

        // Iterate through pages
        for (let currentPage = 1; currentPage <= pagesToScrape; currentPage++) {
            const pageUrl = `${capterra.url}${currentPage > 1 ? `?page=${currentPage}` : ''}`;
            console.log(`Scraping page ${currentPage}/${pagesToScrape}: ${pageUrl}`);

            await page.goto(pageUrl);
            await page.waitForSelector('.review-card');
            const pageHtml = await page.content();

            const pageReviews = await extractReviewsFromPage(pageHtml);

            // For the last page, we might need to trim the reviews to match the requested number
            if (currentPage === pagesToScrape) {
                const remainingNeeded = reviewsToScrape - allReviews.length;
                allReviews.push(...pageReviews.slice(0, remainingNeeded));
            } else {
                allReviews.push(...pageReviews);
            }

            // If we've reached the desired number of reviews, break
            if (allReviews.length >= reviewsToScrape) {
                break;
            }

            // Add a small delay between pages
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Prepare final output
        const output: CapterraOutput = {
            productUrl: capterra.url,
            totalReviews: allReviews.length,
            reviews: allReviews
        };

        // Save to file
        const outputPath = './09_Capterra/outputs/output.json';
        await fs.mkdir('./09_Capterra/outputs', { recursive: true });
        await fs.writeFile(outputPath, JSON.stringify(output, null, 2));

        console.log(`Successfully extracted ${allReviews.length} reviews`);
    } catch (error) {
        console.error('Error in Capterra extraction:', error);
    }
}
