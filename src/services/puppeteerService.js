const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class PuppeteerService {
  async captureScreenshot(youtubeUrl, jobId) {
    const startTime = Date.now();
    let browser = null;
    
    try {
      console.log(`🌐 Launching Puppeteer for ${youtubeUrl}...`);
      
      // Launch browser with optimized settings
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      console.log(`📄 Loading page: ${youtubeUrl}`);
      
      // Navigate to YouTube URL with timeout
      await page.goto(youtubeUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for video player to load
      await page.waitForSelector('video', { timeout: 15000 });
      
      // Get video title
      let title = 'Unknown Video';
      try {
        title = await page.$eval('h1.ytd-video-primary-info-renderer', el => el.textContent.trim());
      } catch (e) {
        try {
          title = await page.$eval('h1 yt-formatted-string', el => el.textContent.trim());
        } catch (e2) {
          console.log('⚠️  Could not extract video title');
        }
      }

      console.log(`📺 Video title: ${title}`);

      // Try to start playback (click play button if needed)
      try {
        const playButton = await page.$('.ytp-large-play-button, .ytp-play-button');
        if (playButton) {
          await playButton.click();
          console.log('▶️  Clicked play button');
          await page.waitForTimeout(2000); // Wait for playback to start
        }
      } catch (e) {
        console.log('ℹ️  Play button not found or auto-playing');
      }

      // Verify video is playing
      const isPlaying = await page.evaluate(() => {
        const video = document.querySelector('video');
        return video && !video.paused && video.currentTime > 0;
      });

      console.log(`🎬 Video playing: ${isPlaying ? 'Yes' : 'No'}`);

      // Take screenshot
      const screenshotDir = path.join(__dirname, '..', '..', 'screenshots');
      const screenshotPath = path.join(screenshotDir, `${jobId}.png`);
      
      // Ensure screenshots directory exists
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      
      await page.screenshot({
        path: screenshotPath,
        type: 'png',
        fullPage: false
      });

      const duration = Date.now() - startTime;
      console.log(`📸 Screenshot captured in ${duration}ms: ${screenshotPath}`);

      return {
        success: true,
        path: `/screenshots/${jobId}.png`,
        title: title,
        duration: duration,
        playing: isPlaying
      };

    } catch (error) {
      console.error('❌ Puppeteer error:', error.message);
      throw new Error(`Screenshot capture failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async getVideoInfo(youtubeUrl) {
    let browser = null;
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(youtubeUrl, { waitUntil: 'networkidle2' });

      const info = await page.evaluate(() => {
        const title = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim();
        const duration = document.querySelector('.ytp-time-duration')?.textContent?.trim();
        const views = document.querySelector('span.view-count')?.textContent?.trim();
        
        return { title, duration, views };
      });

      return info;
    } catch (error) {
      console.error('Error getting video info:', error.message);
      return { title: 'Unknown', duration: null, views: null };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = new PuppeteerService();
