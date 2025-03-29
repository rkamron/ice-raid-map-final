import * as cheerio from "cheerio";

// Define the structure for a scraped social media raid
interface ScrapedSocialMediaRaid {
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

// Main function to scrape raids from social media sources
export async function scrapeSocialMediaRaids(): Promise<ScrapedSocialMediaRaid[]> {
  console.log("Scraping social media sources for ICE raids");
  
  const raids: ScrapedSocialMediaRaid[] = [];
  
  try {
    // We'll scrape from trusted social media aggregators that collect and verify reports
    const sourcesToScrape = [
      { url: "https://unitedwedream.org/protect-immigrants-now/", name: "United We Dream", scraper: scrapeUnitedWeDream },
      // Add more social media sources here
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
    
    console.log(`Completed social media scraping. Found ${raids.length} raids.`);
    return raids;
  } catch (error) {
    console.error("Error in social media scraping:", error);
    return raids;
  }
}

// Scraper for United We Dream reports
async function scrapeUnitedWeDream(url: string, sourceName: string): Promise<ScrapedSocialMediaRaid[]> {
  const raids: ScrapedSocialMediaRaid[] = [];
  
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
    
    // Find report entries (this selector would need to be adapted to the actual site structure)
    $(".report-entry, .raid-report, .community-alert").each((_, element) => {
      try {
        const reportElement = $(element);
        
        // Extract date (would need to be adapted to site's format)
        const dateText = reportElement.find(".report-date, .date").text().trim();
        const raidDate = parseDate(dateText);
        
        // Skip if the raid is older than a week or if date couldn't be parsed
        if (!raidDate || raidDate < oneWeekAgo) {
          return;
        }
        
        // Extract location
        const locationText = reportElement.find(".report-location, .location").text().trim();
        const locationInfo = extractLocationFromText(locationText);
        
        if (!locationInfo) {
          return;
        }
        
        // Extract description
        const description = reportElement.find(".report-description, .description, .content").text().trim();
        
        // Extract title or generate one
        let title = reportElement.find(".report-title, .title, h3").text().trim();
        if (!title) {
          title = `ICE activity reported in ${locationInfo.location}`;
        }
        
        raids.push({
          title,
          description,
          location: locationInfo.location,
          state: locationInfo.state,
          raidType: determineRaidType(title, description),
          sourceType: "Social Media",
          sourceUrl: url,
          sourceName,
          raidDate,
          detaineeCount: extractDetaineeCount(title, description)
        });
      } catch (itemError) {
        console.error(`Error processing ${sourceName} report:`, itemError);
      }
    });
    
    console.log(`Found ${raids.length} raids from ${sourceName}`);
    return raids;
  } catch (error) {
    console.error(`Error scraping ${sourceName}:`, error);
    return raids;
  }
}

// Helper function to parse dates in various formats
function parseDate(dateText: string): Date | null {
  if (!dateText) return null;
  
  // Try standard date parsing
  let date = new Date(dateText);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try different date formats
  // Format: "Month Day, Year" or "Month Day"
  const monthDayYearRegex = /([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/;
  const match = dateText.match(monthDayYearRegex);
  
  if (match) {
    const month = match[1];
    const day = parseInt(match[2], 10);
    const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
    
    const months = ["January", "February", "March", "April", "May", "June", 
                    "July", "August", "September", "October", "November", "December"];
    
    const monthIndex = months.findIndex(m => 
      month.toLowerCase().startsWith(m.toLowerCase())
    );
    
    if (monthIndex !== -1) {
      return new Date(year, monthIndex, day);
    }
  }
  
  // Try relative dates like "2 days ago", "yesterday"
  if (dateText.includes("day ago") || dateText.includes("days ago")) {
    const daysMatch = dateText.match(/(\d+)\s+days?\s+ago/);
    if (daysMatch) {
      const daysAgo = parseInt(daysMatch[1], 10);
      const result = new Date();
      result.setDate(result.getDate() - daysAgo);
      return result;
    }
  }
  
  if (dateText.toLowerCase().includes("yesterday")) {
    const result = new Date();
    result.setDate(result.getDate() - 1);
    return result;
  }
  
  if (dateText.toLowerCase().includes("today")) {
    return new Date();
  }
  
  return null;
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

// Helper function to determine raid type from text
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
