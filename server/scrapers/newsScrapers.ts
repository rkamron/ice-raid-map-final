import * as cheerio from "cheerio";

// Define the structure for a scraped news raid
interface ScrapedNewsRaid {
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

// Main function to scrape raids from news sources
export async function scrapeNewsRaids(): Promise<ScrapedNewsRaid[]> {
  console.log("Scraping news sources for ICE raids");
  
  const raids: ScrapedNewsRaid[] = [];
  
  try {
    // We'll scrape multiple news sources
    const sourcesToScrape = [
      { url: "https://www.ice.gov/news/all", name: "ICE News Releases", scraper: scrapeIceGov },
      // Temporarily comment out the IDP scraper due to URL issues
      // { url: "https://www.immigrantdefenseproject.org/ice-watch/", name: "Immigrant Defense Project", scraper: scrapeImmigrantDefenseProject },
      // Add more news sources here
    ];
    
    // Run all scrapers in parallel
    const scrapingPromises = sourcesToScrape.map(async (source) => {
      try {
        const sourceRaids = await source.scraper(source.url, source.name);
        raids.push(...sourceRaids);
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
      }
    });
    
    await Promise.all(scrapingPromises);
    
    console.log(`Completed news scraping. Found ${raids.length} raids.`);
    return raids;
  } catch (error) {
    console.error("Error in news scraping:", error);
    return raids;
  }
}

// Scraper for ICE.gov news releases
async function scrapeIceGov(url: string, sourceName: string): Promise<ScrapedNewsRaid[]> {
  const raids: ScrapedNewsRaid[] = [];
  
  try {
    console.log(`Scraping ${sourceName}`);
    
    // Fetch the page content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Define the current date and one week ago
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Find news items
    $(".field--name-node-title h2 a").each((_, element) => {
      try {
        const titleElement = $(element);
        const title = titleElement.text().trim();
        
        // Skip if not related to enforcement or raids
        const keywords = ["enforcement", "arrest", "raid", "operation", "detain", "remove"];
        if (!keywords.some(keyword => title.toLowerCase().includes(keyword))) {
          return;
        }
        
        // Get the news URL
        const relativeUrl = titleElement.attr("href");
        const sourceUrl = relativeUrl ? `https://www.ice.gov${relativeUrl}` : "";
        
        // Get the date
        const dateElement = titleElement.closest(".views-row").find(".field--name-node-post-date time");
        const dateText = dateElement.text().trim();
        const raidDate = new Date(dateText);
        
        // Skip if the raid is older than a week
        if (raidDate < oneWeekAgo) {
          return;
        }
        
        // Get the description (first paragraph)
        const description = titleElement.closest(".views-row").find(".field--name-field-body p").first().text().trim();
        
        // Try to extract location information
        const locationInfo = extractLocationFromText(title + " " + description);
        
        if (locationInfo) {
          raids.push({
            title,
            description,
            location: locationInfo.location,
            state: locationInfo.state,
            raidType: determineRaidType(title, description),
            sourceType: "News",
            sourceUrl,
            sourceName,
            raidDate,
            detaineeCount: extractDetaineeCount(title, description)
          });
        }
      } catch (itemError) {
        console.error("Error processing ICE.gov news item:", itemError);
      }
    });
    
    console.log(`Found ${raids.length} raids from ${sourceName}`);
    return raids;
  } catch (error) {
    console.error(`Error scraping ${sourceName}:`, error);
    return raids;
  }
}

// Scraper for Immigrant Defense Project
async function scrapeImmigrantDefenseProject(url: string, sourceName: string): Promise<ScrapedNewsRaid[]> {
  const raids: ScrapedNewsRaid[] = [];
  
  try {
    console.log(`Scraping ${sourceName}`);
    
    // Fetch the page content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Define the current date and one week ago
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Find raid reports
    $(".raid-report").each((_, element) => {
      try {
        const reportElement = $(element);
        
        // Get date information
        const dateText = reportElement.find(".raid-date").text().trim();
        const raidDate = new Date(dateText);
        
        // Skip if the raid is older than a week
        if (raidDate < oneWeekAgo) {
          return;
        }
        
        // Get location information
        const locationText = reportElement.find(".raid-location").text().trim();
        const locationInfo = extractLocationFromText(locationText);
        
        if (!locationInfo) {
          return;
        }
        
        // Get description
        const description = reportElement.find(".raid-description").text().trim();
        
        // Create a title from location and date
        const title = `ICE raid in ${locationInfo.location} on ${dateText}`;
        
        raids.push({
          title,
          description,
          location: locationInfo.location,
          state: locationInfo.state,
          raidType: determineRaidType("", description),
          sourceType: "Community Alert",
          sourceUrl: url,
          sourceName,
          raidDate,
          detaineeCount: extractDetaineeCount("", description)
        });
      } catch (itemError) {
        console.error("Error processing IDP raid report:", itemError);
      }
    });
    
    console.log(`Found ${raids.length} raids from ${sourceName}`);
    return raids;
  } catch (error) {
    console.error(`Error scraping ${sourceName}:`, error);
    return raids;
  }
}

// Helper function to extract location and state from text
function extractLocationFromText(text: string): { location: string; state: string } | null {
  // List of US states and their abbreviations
  const states = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
    "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
    "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
    "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
    "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
  };
  
  // Check for city, state patterns
  // 1. "City, STATE" or "City, State"
  const cityStateRegex = /([A-Za-z\s.-]+),\s+([A-Za-z]{2}|[A-Za-z\s]+)/g;
  
  let match;
  while ((match = cityStateRegex.exec(text)) !== null) {
    const city = match[1].trim();
    const stateText = match[2].trim();
    
    // Determine the state
    let state = stateText;
    if (stateText.length > 2) {
      // If it's a full state name, convert to abbreviation
      const stateEntry = Object.entries(states).find(([fullName]) => 
        fullName.toLowerCase() === stateText.toLowerCase()
      );
      if (stateEntry) {
        state = stateEntry[1]; // Use the abbreviation
      } else {
        continue; // Not a valid state name
      }
    } else {
      // Validate that the two-letter code is a valid state abbreviation
      const isValidAbbreviation = Object.values(states).some(abbr => 
        abbr.toLowerCase() === stateText.toLowerCase()
      );
      if (!isValidAbbreviation) {
        continue;
      }
      state = stateText.toUpperCase();
    }
    
    return {
      location: `${city}, ${state}`,
      state
    };
  }
  
  return null;
}

// Helper function to determine raid type from text content
function determineRaidType(title: string, description: string): string {
  const combinedText = (title + " " + description).toLowerCase();
  
  if (combinedText.includes("workplace") || 
      combinedText.includes("work site") || 
      combinedText.includes("business") || 
      combinedText.includes("factory") || 
      combinedText.includes("restaurant")) {
    return "Workplace";
  }
  
  if (combinedText.includes("home") || 
      combinedText.includes("house") || 
      combinedText.includes("apartment") || 
      combinedText.includes("residential")) {
    return "Residential";
  }
  
  if (combinedText.includes("checkpoint") || 
      combinedText.includes("highway") || 
      combinedText.includes("traffic") || 
      combinedText.includes("road") ||
      combinedText.includes("interstate")) {
    return "Checkpoint";
  }
  
  return "Other";
}

// Helper function to extract detainee count from text
function extractDetaineeCount(title: string, description: string): number | undefined {
  const combinedText = title + " " + description;
  
  // Look for patterns like "X individuals were arrested/detained"
  const detaineeRegexes = [
    /(\d+)\s+(?:individuals|people|persons|immigrants|migrants|workers|undocumented|illegal aliens)\s+(?:were|was)\s+(?:arrested|detained|taken into custody)/i,
    /arrested\s+(\d+)\s+(?:individuals|people|persons|immigrants|migrants|workers|undocumented|illegal aliens)/i,
    /detained\s+(\d+)\s+(?:individuals|people|persons|immigrants|migrants|workers|undocumented|illegal aliens)/i
  ];
  
  for (const regex of detaineeRegexes) {
    const match = combinedText.match(regex);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  
  return undefined;
}
