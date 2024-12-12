import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFile } from 'fs';
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

    await page.goto(`https://www.youtube.com/results?search_query=${query}`);
    await page.waitForSelector('.yt-simple-endpoint');

    const links = await page.$$eval('a#video-title', (video) => {
        return video.map(v => ({ "link": v.href, "title": v.innerText }));
    });

    console.log(links);

    const finallst = [];

    for (const link of links) {
        const objforthisvideo = {
            "title": link.title,
            "link": link.link,
            "total_comments" : 0,
            "comments": []
        };

        await page.goto(link.link); 
        await page.waitForSelector('h2#count');
        objforthisvideo.total_comments = await page.$eval('h2#count', (element) => {
            return element ? element.innerText : '0';
          });

        const comments = await page.$$eval('ytd-comment-thread-renderer', (commentElements) => {
            return commentElements.map(comment => {
                const author = comment.querySelector('a#author-text')?.innerText || 'No author';
                const time = comment.querySelector('span#published-time-text')?.innerText || 'No date';
                const content = comment.querySelector('#content-text')?.innerText || 'No content';
                return { author, time, content };
            });
        });

        objforthisvideo.comments = comments; 

        console.log(objforthisvideo); 

        finallst.push(objforthisvideo); 
    }
    
    await browser.close();
    await writeFile('./extractedcomments.json', JSON.stringify(finallst), 'utf-8', (err) => {
        if (err) throw err;
        console.log('saved the file');
      });
    console.log(finallst);
})();


