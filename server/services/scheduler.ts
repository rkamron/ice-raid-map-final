import { initScrapers } from "../scrapers";

let scrapeInterval: NodeJS.Timeout | null = null;

// Set up scheduled scraping
export function setupScheduler() {
  console.log("Setting up scheduled scraping");
  
  // Clear any existing interval
  if (scrapeInterval) {
    clearInterval(scrapeInterval);
  }
  
  // Schedule scraping every 6 hours by default
  // In production, you might want to use a more robust scheduler like node-cron
  const scrapeIntervalHours = 6;
  const scrapeIntervalMs = scrapeIntervalHours * 60 * 60 * 1000;
  
  scrapeInterval = setInterval(async () => {
    console.log(`Running scheduled scrape (every ${scrapeIntervalHours} hours)`);
    try {
      await initScrapers();
    } catch (error) {
      console.error("Error during scheduled scraping:", error);
    }
  }, scrapeIntervalMs);
  
  // Also run immediately on startup
  setTimeout(async () => {
    console.log("Running initial scrape on startup");
    try {
      await initScrapers();
    } catch (error) {
      console.error("Error during initial scraping:", error);
    }
  }, 5000); // Short delay to allow server to start up fully
  
  return scrapeInterval;
}

// Stop the scheduler
export function stopScheduler() {
  if (scrapeInterval) {
    clearInterval(scrapeInterval);
    scrapeInterval = null;
    console.log("Scheduled scraping stopped");
  }
}
