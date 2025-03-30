import { initScraperURL } from "./urlScraper";
import { storage } from "../storage";
import { geocodeLocation } from "../services/geocoder";
import { InsertIceRaid } from "@shared/schema";

interface ScrapedRaid {
  title: string;
  description: string;
  location: string;
  state: string;
  raidType: string;
  sourceType: string;
  sourceUrl: string;
  sourceName: string;
  raidDate: Date;
  detaineeCount?: number;
}

export async function initScrapers() {
  console.log("Starting scraping process");
  
  try {
    // Scrape url for ICE raids
    const allScrapedRaids: ScrapedRaid[] = [];
    
    // Initialize the URL scraper with the ICE newsroom URL
    const urlIn = 'https://www.ice.gov/newsroom';
    console.log(`Starting to scrape: ${urlIn}`);
    
    // Get raid information from the URL scraper
    const scrapedRaids = await initScraperURL(urlIn);
    
    // Add valid scraped raids to our collection
    if (scrapedRaids && scrapedRaids.length > 0) {
      console.log(`Found ${scrapedRaids.length} raids from URL scraper`);
      allScrapedRaids.push(...scrapedRaids);
    } else {
      console.log("No raids found from URL scraper");
    }
    
    // Process and store each raid
    console.log(`Beginning to process ${allScrapedRaids.length} total raids`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const raid of allScrapedRaids) {
      try {
        const result = await processAndStoreRaid(raid);
        if (result === 'success') {
          successCount++;
        } else if (result === 'skip') {
          skipCount++;
        }
      } catch (error) {
        console.error(`Error processing raid "${raid.title}":`, error);
        errorCount++;
      }
    }
    
    console.log(`Scraping completed. Results:
    - Total raids processed: ${allScrapedRaids.length}
    - Successfully stored: ${successCount}
    - Skipped (duplicates): ${skipCount}
    - Errors: ${errorCount}`);
    
  } catch (error) {
    console.error("Error during scraping process:", error);
  }
}

async function processAndStoreRaid(raid: ScrapedRaid): Promise<'success' | 'skip' | 'error'> {
  try {
    // Validate raid data
    if (!raid.title || !raid.location || raid.title === "NOT FOUND" || raid.location === "NOT FOUND") {
      console.log(`Skipping invalid raid with missing data: ${raid.title || 'Untitled'}`);
      return 'skip';
    }
    
    // Check if the raid already exists to avoid duplicates
    const existingRaids = await storage.getAllRaids();
    const duplicateRaid = existingRaids.find(r => r.sourceUrl === raid.sourceUrl);
    
    if (duplicateRaid) {
      console.log(`Skipping duplicate raid: ${raid.title}`);
      return 'skip';
    }
    
    // Geocode the location
    console.log(`Geocoding location: ${raid.location}`);
    const coordinates = await geocodeLocation(raid.location);
    
    if (!coordinates) {
      console.error(`Failed to geocode location for raid: ${raid.title}, location: ${raid.location}`);
      return 'error';
    }
    
    // Prepare raid data for storage
    const raidData: InsertIceRaid = {
      title: raid.title,
      description: raid.description,
      location: raid.location,
      state: raid.state,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      raidType: raid.raidType,
      sourceType: raid.sourceType,
      sourceUrl: raid.sourceUrl,
      sourceName: raid.sourceName,
      raidDate: raid.raidDate,
      detaineeCount: raid.detaineeCount,
      verified: true, // Auto-verified for now, could be changed in production
    };
    
    // Store the raid
    await storage.createRaid(raidData);
    console.log(`Successfully stored new raid: ${raid.title}`);
    return 'success';
  } catch (error) {
    console.error(`Error processing raid ${raid.title}:`, error);
    return 'error';
  }
}