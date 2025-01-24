"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const fs_1 = require("fs");
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
function getYouTubeComments(page, videoUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        let allComments = [];
        const networkListener = (response) => __awaiter(this, void 0, void 0, function* () {
            try {
                const request = response.request();
                const method = request.method().toUpperCase();
                if (method === 'OPTIONS')
                    return;
                const url = response.url();
                if (url.includes('youtubei/v1/next?prettyPrint=false')) {
                    const responseData = yield response.json();
                    if (responseData) {
                        allComments.push(responseData);
                    }
                    else {
                        console.log('No continuationItems in responseData. Check response structure.');
                    }
                }
            }
            catch (err) {
                console.error('Error in network listener:', err);
            }
        });
        page.on('response', networkListener);
        yield page.goto(videoUrl);
        yield page.waitForSelector('div#contents');
        let lastHeight = yield page.evaluate(() => document.documentElement.scrollHeight);
        let scrollAttempts = 0;
        const maxScrollAttempts = 40;
        let scrolledEnough = false;
        const smoothScroll = (page_1, ...args_1) => __awaiter(this, [page_1, ...args_1], void 0, function* (page, delay = 100) {
            yield page.evaluate((delay) => __awaiter(this, void 0, void 0, function* () {
                const distance = 300;
                let scrolled = 0;
                const totalHeight = document.documentElement.scrollHeight;
                while (scrolled < totalHeight) {
                    window.scrollBy(0, distance);
                    scrolled += distance;
                    yield new Promise(resolve => setTimeout(resolve, delay));
                }
            }), delay);
        });
        while (scrollAttempts < maxScrollAttempts && !scrolledEnough) {
            yield smoothScroll(page, 150);
            yield new Promise(resolve => setTimeout(resolve, 3000));
            const newHeight = yield page.evaluate(() => document.documentElement.scrollHeight);
            if (newHeight === lastHeight) {
                console.log('Reached the end of the comments.');
                scrolledEnough = true;
            }
            else {
                lastHeight = newHeight;
                scrollAttempts++;
                console.log(`Scrolled ${scrollAttempts} times.`);
            }
        }
        const buttons = yield page.$$('div.more-button');
        for (let button of buttons) {
            yield button.click();
            yield new Promise(resolve => setTimeout(resolve, 2000));
        }
        yield new Promise(resolve => setTimeout(resolve, 5000));
        page.off('response', networkListener);
        if (allComments.length > 0) {
            try {
                yield fs_1.promises.writeFile('./all_comments.json', JSON.stringify(allComments, null, 2), 'utf-8');
                console.log('Saved all comments to file');
            }
            catch (err) {
                console.error('Error saving data to file:', err);
            }
        }
        else {
            console.log('No comments were captured.');
        }
    });
}
// Main execution function
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_extra_1.default.launch({
            headless: false,
            defaultViewport: {
                width: 1600,
                height: 1000,
                deviceScaleFactor: 1
            }
        });
        try {
            const page = yield browser.newPage();
            const videoUrl = 'https://www.youtube.com/watch?v=aLJfvepNA08'; // Replace with your video URL
            yield getYouTubeComments(page, videoUrl);
        }
        catch (error) {
            console.error('Error occurred:', error);
        }
        finally {
            yield browser.close();
        }
    });
}
// Run the script
main().catch(console.error);
