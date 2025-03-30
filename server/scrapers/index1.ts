

import { scrapeNewsRaids } from "./newsScrapers";
import { scrapeSocialMediaRaids } from "./socialMediaScrapers";
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
    // Collect scraped data from different sources
    const newsRaids = await scrapeNewsRaids();
    const socialMediaRaids = await scrapeSocialMediaRaids();

    // Combine all scraped data
    const allScrapedRaids = [...newsRaids, ...socialMediaRaids];
    
    // Process and store each raid
    for (const raid of allScrapedRaids) {
      await processAndStoreRaid(raid);
    }
    
    console.log(`Scraping completed. Processed ${allScrapedRaids.length} raids.`);
  } catch (error) {
    console.error("Error during scraping process:", error);
  }
}

async function processAndStoreRaid(raid: ScrapedRaid) {
  try {
    // Check if the raid already exists to avoid duplicates
    // This is a simple check based on URL, but could be more sophisticated
    const existingRaids = await storage.getAllRaids();
    const duplicateRaid = existingRaids.find(r => r.sourceUrl === raid.sourceUrl);
    
    if (duplicateRaid) {
      console.log(`Skipping duplicate raid: ${raid.title}`);
      return;
    }
    
    // Geocode the location
    const coordinates = await geocodeLocation(raid.location);
    
    if (!coordinates) {
      console.error(`Failed to geocode location for raid: ${raid.title}`);
      return;
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
    console.log(`Stored new raid: ${raid.title}`);
  } catch (error) {
    console.error(`Error processing raid ${raid.title}:`, error);
  }
}
