import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const links = (async () => {
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
        return video.map(v => ({"link":v.href, "title":v.innerText}))
    })
    console.log(links)
    // await page.screenshot({ path: 'yt.jpg' });

    await browser.close();

})();

module.exports = {links}