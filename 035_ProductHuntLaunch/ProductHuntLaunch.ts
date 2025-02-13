import { promises as fs } from 'fs';
import { Page } from 'puppeteer';
import * as cheerio from 'cheerio';

interface ProductHuntData {
    productHuntReview: any; // Using any to store all available review data
    productHuntPerson: any; // Using any to store all available person data
}

async function extractInitialReviews(html: string): Promise<ProductHuntData[]> {
    const $ = cheerio.load(html);
    const reviews: ProductHuntData[] = [];

    // Find the script containing the initial reviews data
    const scriptContent = $('script[type="application/ld+json"]').text();
    if (!scriptContent) return reviews;

    try {
        const jsonData = JSON.parse(scriptContent);
        // Find the object containing reviews
        const reviewsData = jsonData.find((item: any) => item.review)?.review || [];

        reviewsData.forEach((review: any) => {
            reviews.push({
                productHuntReview: review,
                productHuntPerson: review.author
            });
        });
    } catch (error) {
        console.error('Error parsing initial reviews:', error);
    }

    return reviews;
}

export async function ProductHuntCommentExtract(
    page: Page,
    producthunt: { productHuntLaunchUrl: string; numberOfComments: number }
): Promise<void> {
    try {
        await page.goto(producthunt.productHuntLaunchUrl);
        const element = await page.waitForSelector('div.text-24');

        // Get total number of reviews
        let totalReviews = 0;
        if (element) {
            const text = await element.evaluate(el => el.textContent);
            totalReviews = parseInt(text?.split(' ')[0].replace(',', '') || '0');
        }

        // Extract initial reviews from HTML
        const html = await page.content();
        let allReviews = await extractInitialReviews(html);
        // lets store this in a file names initial_reviews.json
        await fs.writeFile(
            './03_ProductHuntCommentExtract/outputs/initial_reviews.json',
            JSON.stringify(allReviews, null, 2)
        );

        // Calculate number of "Show More" clicks needed (10 reviews per page)
        const clicksNeeded = Math.ceil(
            (totalReviews >= producthunt.numberOfComments ? producthunt.numberOfComments - 10 : totalReviews - 10) / 10
        );

        // Set up network listener for GraphQL responses
        const graphqlResponses: any[] = [];

        page.on('response', async response => {
            try {
                if (response.url().includes('https://www.producthunt.com/frontend/graphql')) {
                    const responseData = await response.json();
                    if (responseData?.data?.product?.reviews?.edges) {
                        graphqlResponses.push(responseData);
                    }
                }
            } catch (error) {
                // Ignore response parsing errors
            }
        });

        // Click "Show More" button repeatedly
        for (let i = 0; i < clicksNeeded; i++) {
            try {
                await page.waitForSelector('button.styles_reset__0clCw.styles_button__BmLM4.styles_full__j4aVK.mb-8');
                await page.click('button.styles_reset__0clCw.styles_button__BmLM4.styles_full__j4aVK.mb-8');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error clicking "Show More" button on iteration ${i}:`, error);
                break;
            }
        }

        // Process GraphQL responses
        graphqlResponses.forEach(response => {
            const edges = response.data.product.reviews.edges;
            edges.forEach((edge: any) => {
                allReviews.push({
                    productHuntReview: edge.node,
                    productHuntPerson: edge.node.user
                });
            });
        });

        // Save results
        const finalObject = {
            productUrl: producthunt.productHuntLaunchUrl,
            totalReviews,
            extractedReviews: allReviews.length,
            reviews: allReviews
        };
        console.log(finalObject);

        await fs.writeFile(
            './03_ProductHuntCommentExtract/outputs/producthunt_reviews.json',
            JSON.stringify(finalObject, null, 2)
        );
        console.log(`Successfully extracted ${allReviews.length} reviews out of ${totalReviews} total reviews`);
    } catch (error) {
        console.error('Error in ProductHunt extraction:', error);
    }
}
