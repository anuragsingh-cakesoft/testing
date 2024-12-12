import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    let query = "dripify";
    
    await page.setViewport({
        width: 1600,
        height: 1000,
        deviceScaleFactor: 1,
    });

    const objforthisvideo = {
        "comments": []
    };

    await page.goto('https://www.youtube.com/watch?v=qo_fUjb02ns');
    await page.waitForSelector('div#main');

    const comments = await page.$$eval('ytd-comment-thread-renderer', (commentElements) => {
        return commentElements.map(comment => {
            const author = comment.querySelector('a#author-text')?.innerText || 'No author';
            const time = comment.querySelector('span#published-time-text')?.innerText || 'No date';
            const content = comment.querySelector('#content-text')?.innerText || 'No content';
            const final = {
                "author": author,
                "time": time,
                "content": content
            };
            return final;
        });
    });

    objforthisvideo.comments = comments; // Assigning all comments to the video object

    console.log(objforthisvideo);
    await browser.close();

})();

