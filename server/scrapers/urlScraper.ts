import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenAI} from '@google/genai';
import { url } from 'inspector';
import fs from 'fs';
import path from 'path';
// Configuration for Gemini API
const GEMINI_API_KEY = 'AIzaSyBD4m4cJbEkOb_yyaI6XVfBz3v_ytGckEs'; // Replace with your actual API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

//Function to store the scraped data in json format
const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, '$1');
const dataPath = path.join(__dirname, 'scrapedData.json');
if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify([]));
}
// Function to save scraped data to a JSON file


// Function to fetch and parse webpage content
async function fetchWebpageContent(url: string): Promise<{content: string}> {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        // Use cheerio to extract content
        const $ = cheerio.load(response.data);
        
        // Remove script and style elements
        $('script, style').remove();
        
        // Get text from body
        let text = $('body').text();
        
        // Clean up excessive whitespace
        text = text.replace(/\s+/g, ' ').trim().replace(/(?<!\n)\s/g, '\n');
        
       
        
        return {
            content: text,
        };
    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
        throw new Error('Failed to fetch webpage content');
    }
}

// Function to check if content is related to ICE raids
async function isAboutICERaids(content: string): Promise<boolean> {
    // Comprehensive keyword check
    const keywords = [
        'ICE raid', 'immigration raid', 'ICE enforcement', 'deportation raid', 
        'immigration arrest', 'ICE operation', 'immigration sweep', 
        'ICE detain', 'ICE apprehension', 'customs enforcement', 'ICE'
    ];
    return keywords.some(keyword => 
        new RegExp(`\\b${keyword}\\b`, 'i').test(content)
    );
}

// Function to extract information using Gemini API
async function extractRaidInfo(content: string, url: string): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `
    Analyze the following news article text and extract specific information about ICE raids. 
    Return a text summary about the raid, including only the following details if available, keep them all under the provided variable names:
    - Title of the article (variable name: title)
    - Description/summary of the raid (variable name: description)
    - Location (city)
    - State (state)
    - Type of raid (variable name: type_raid  - workplace raid, home raid, etc.)
    - Source URL (variable name: source_url)
    - Source name (variable name: website_name)
    - Date of the raid (variable name: date_raid)
    - Number of detainees (variable name: num_detainees)
    DO NOT INCLUDE ANY OTHER INFORMATION or WORDS. IF ANY OF THE VARIABLES ARE NOT FOUND, RETURN 'NOT FOUND' FOR THAT VARIABLE.
    If there are multiple articles, summarize each one separately.
    following format for the output provided above
    Article text:
    ${content.substring(0, 10000)} // Limiting to first 10k chars to avoid token limits
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt, 
        });

        // Extract the text response from Gemini
        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No content available';

        // Add the source URL to the response
        const result = {
            text: responseText,
            sourceUrl: url,
        };

        return result;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error('Failed to extract information from content');
    }
}

// Main function to process a URL
async function processICERaidUrl(url: string): Promise<any> {
    try {
        console.log(`Processing URL: ${url}`);
        
        // Step 1: Fetch webpage content
        const {content} = await fetchWebpageContent(url);
        
        // Step 2: Check if content is about ICE raids
        const isICERaid = await isAboutICERaids(content);
        if (!isICERaid) {
            return {
                isAboutICERaids: false,
                message: 'Content does not appear to be about ICE raids (no raid-related keywords found)',
                url,
                timestamp: new Date().toISOString()
            };
        }
        
        // Step 3: Extract relevant information using Gemini
        const raidInfo = await extractRaidInfo(content, url);
        
        // If Gemini determined it's not about ICE raids
        if (raidInfo.isAboutICERaids === false) {
            return {
                isAboutICERaids: false,
                message: 'Content does not contain specific ICE raid information (no date, location, or raid details)',
                url,
                timestamp: new Date().toISOString()
            };
        }
        
        return {
            ...raidInfo,
            url,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
        return {
            url,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            isAboutICERaids: false
        };
    }
}

// Export function to be used in the scheduler
export async function initScraperURL(urlIn:string): Promise<any> {
    try {
      const url = urlIn;
      const raidInfo = await processICERaidUrl(url);
      //save the scraped data to a JSON file
      const scrapedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      scrapedData.push(raidInfo);
      fs.writeFileSync(dataPath, JSON.stringify(scrapedData, null, 2));
      console.log(`Data saved to ${dataPath}`);
      return raidInfo;      
    } catch (error) {
      console.error("Error during scraping initialization:", error);
    }
  }
  
  // Example usage (removed duplicate invocation)
;