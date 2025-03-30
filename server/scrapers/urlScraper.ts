import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define ScrapedRaid interface here for clarity
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

// Configuration for Gemini API
const GEMINI_API_KEY = 'AIzaSyBD4m4cJbEkOb_yyaI6XVfBz3v_ytGckEs'; // Replace with your actual API key

// File path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, 'scrapedData.json');

// Ensure directory exists
if (!fs.existsSync(__dirname)) {
    fs.mkdirSync(__dirname, { recursive: true });
}

// Initialize file if it doesn't exist
if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify([]));
}

// Function to fetch article links from the newsroom page
async function fetchArticleLinks(url: string): Promise<string[]> {
    try {
        console.log(`Fetching article links from: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const links: string[] = [];
        
        // Find all news release links - adjust selector based on actual page structure
        // This is a generic selector that looks for links within main content areas
        $('main a, .news-item a, .newsroom-content a, article a').each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
                // Handle both absolute and relative URLs
                const fullUrl = href.startsWith('http') ? href : new URL(href, url).toString();
                // Only add if it's likely a news article (contains keywords or patterns)
                if (
                    fullUrl.includes('/news/') || 
                    fullUrl.includes('/releases/') || 
                    fullUrl.includes('/newsroom/') ||
                    /\d{4}\/\d{2}\//.test(fullUrl) // Date pattern in URL
                ) {
                    links.push(fullUrl);
                }
            }
        });
        
        console.log(`Found ${links.length} potential article links`);
        return Array.from(new Set(links)); // Remove duplicates
    } catch (error) {
        console.error('Error fetching article links:', error);
        return [];
    }
}

// Function to fetch and parse article content
async function fetchArticleContent(url: string): Promise<{ content: string }> {
    try {
        console.log(`Fetching article content: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000 // 10 second timeout
        });
        
        // Use cheerio to extract content
        const $ = cheerio.load(response.data);
        
        // Remove script and style elements
        $('script, style').remove();
        
        // Target main content areas where articles are likely to be
        let text = '';
        $('article, .content, main, .news-content').each((_, element) => {
            text += $(element).text() + ' ';
        });
        
        // If no specific content areas found, fall back to body
        if (!text.trim()) {
            text = $('body').text();
        }
        
        // Clean up excessive whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return {
            content: text,
        };
    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
        throw new Error(`Failed to fetch article content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Improved function to check if content is related to ICE raids
async function isAboutICERaids(content: string): Promise<boolean> {
    // Check for both general ICE terms and specific action terms
    const keywords = [
        'ICE', 'Immigration and Customs Enforcement',
        'arrest', 'operation', 'enforcement', 'detain',
        'removal', 'apprehend', 'deportation', 'custody'
    ];
    
    const hasKeywords = keywords.some(keyword => 
        new RegExp(`\\b${keyword}\\b`, 'i').test(content)
    );
    
    // Additionally check for patterns like "X individuals arrested"
    const arrestPattern = /\d+\s+(individuals|people|persons|foreign nationals|aliens|migrants|immigrants)\s+(arrested|detained|apprehended|in custody|removed)/i;
    
    return hasKeywords || arrestPattern.test(content);
}

// Function to extract information using Gemini API
async function extractRaidInfo(content: string, url: string): Promise<ScrapedRaid> {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `
    Analyze the following ICE news release text and extract specific information about enforcement actions. 
    Return a JSON object with the following structure:
    {
        "title": "[Title of the article]",
        "description": "[Description/summary of the enforcement action]",
        "location": "[City, State]",
        "state": "[State abbreviation]",
        "raidType": "[Type of enforcement - workplace, residential, checkpoint, other]",
        "sourceType": "News",
        "sourceUrl": "${url}",
        "sourceName": "ICE News Releases",
        "raidDate": "[Date of the enforcement action in ISO format]",
        "detaineeCount": [Number of detainees or null]
    }
    
    For location, try to extract both city and state (e.g., "Los Angeles, CA").
    For raidDate, use the date mentioned in the article or the publication date.
    For raidType, classify as: "Workplace" for business raids, "Residential" for home raids, 
    "Checkpoint" for traffic stops, or "Other" for other types.
    
    If this is not about an ICE enforcement action or raid, respond with: { "isAboutICERaids": false }
    
    Article text:
    ${content.substring(0, 10000)}
    `;

    try {
        console.log(`Sending content to Gemini API for analysis: ${url}`);
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt, 
        });

        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
        
        try {
            // Clean the response text by removing markdown code blocks
            let cleanedResponse = responseText
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            
            const parsedResponse = JSON.parse(cleanedResponse);
            
            // Check if Gemini determined it's not about ICE raids
            if (parsedResponse.isAboutICERaids === false) {
                console.log(`Gemini determined content is not about ICE raids: ${url}`);
                return createDefaultRaidObject(url, false);
            }
            
            // Transform into expected format
            return {
                title: parsedResponse.title || "NOT FOUND",
                description: parsedResponse.description || "NOT FOUND",
                location: parsedResponse.location || "NOT FOUND",
                state: parsedResponse.state || "NOT FOUND",
                raidType: parsedResponse.raidType || "Other",
                sourceType: "News",
                sourceUrl: url,
                sourceName: "ICE News Releases",
                raidDate: parsedResponse.raidDate ? new Date(parsedResponse.raidDate) : new Date(),
                detaineeCount: parsedResponse.detaineeCount || undefined
            };
        } catch (e) {
            console.error('Failed to parse Gemini response:', e);
            console.error('Response text was:', responseText);
            return createDefaultRaidObject(url);
        }
    } catch (error) {
        console.error('Gemini API error:', error);
        return createDefaultRaidObject(url);
    }
}

function createDefaultRaidObject(url: string, isValid = true): ScrapedRaid {
    return {
        title: "NOT FOUND",
        description: "NOT FOUND",
        location: "NOT FOUND",
        state: "NOT FOUND",
        raidType: "Other",
        sourceType: "News",
        sourceUrl: url,
        sourceName: "ICE News Releases",
        raidDate: new Date(),
        detaineeCount: undefined
    };
}

// Process a single article URL
async function processICERaidUrl(url: string): Promise<ScrapedRaid & { isAboutICERaids?: boolean }> {
    try {
        console.log(`Processing article URL: ${url}`);
        
        // Step 1: Fetch article content
        const { content } = await fetchArticleContent(url);
        
        // Step 2: Check if content is about ICE raids
        const isICERaid = await isAboutICERaids(content);
        if (!isICERaid) {
            console.log(`Content does not appear to be about ICE raids: ${url}`);
            return {
                ...createDefaultRaidObject(url),
                isAboutICERaids: false
            };
        }
        
        // Step 3: Extract relevant information using Gemini
        const raidInfo = await extractRaidInfo(content, url);
        
        // Add validation check
        const isValid = 
            raidInfo.title !== "NOT FOUND" && 
            raidInfo.location !== "NOT FOUND";
        
        if (!isValid) {
            console.log(`Failed to extract valid raid information: ${url}`);
            return {
                ...raidInfo,
                isAboutICERaids: false
            };
        }
        
        console.log(`Successfully extracted raid information: ${raidInfo.title}`);
        return raidInfo;
    } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
        return {
            ...createDefaultRaidObject(url),
            isAboutICERaids: false
        };
    }
}

// Main export function with rate limiting
export async function initScraperURL(urlIn: string): Promise<ScrapedRaid[]> {
    try {
        // First get all article links from the newsroom page
        const articleLinks = await fetchArticleLinks(urlIn);
        console.log(`Found ${articleLinks.length} articles to process`);
        
        if (articleLinks.length === 0) {
            console.error('No article links found. Check the selectors in fetchArticleLinks function.');
            return [];
        }
        
        const allRaids: ScrapedRaid[] = [];
        
        // Process each article with rate limiting (3 concurrent requests max)
        const concurrencyLimit = 3;
        const activeRequests: Promise<void>[] = [];
        const processQueue: string[] = [...articleLinks];
        
        while (processQueue.length > 0 || activeRequests.length > 0) {
            // Fill up to concurrency limit
            while (processQueue.length > 0 && activeRequests.length < concurrencyLimit) {
                const link = processQueue.shift()!;
                
                const requestPromise = (async () => {
                    try {
                        // Add random delay to avoid being blocked (1-3 seconds)
                        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
                        
                        const raidInfo = await processICERaidUrl(link);
                        if (raidInfo.isAboutICERaids !== false) {
                            // Remove the extraneous property
                            delete raidInfo.isAboutICERaids;
                            allRaids.push(raidInfo);
                        }
                    } catch (error) {
                        console.error(`Error processing article ${link}:`, error);
                    }
                })();
                
                activeRequests.push(requestPromise);
                
                // Remove completed request from active list
                requestPromise.then(() => {
                    const index = activeRequests.indexOf(requestPromise);
                    if (index !== -1) {
                        activeRequests.splice(index, 1);
                    }
                });
            }
            
            // Wait for at least one request to complete
            if (activeRequests.length > 0) {
                await Promise.race(activeRequests);
            }
        }
        
        console.log(`Processing complete. Found ${allRaids.length} valid raids.`);
        
        // Filter out invalid raids
        const validRaids = allRaids.filter(raid => 
            raid.title !== "NOT FOUND" && 
            raid.location !== "NOT FOUND"
        );
        
        console.log(`Found ${validRaids.length} valid raids after filtering.`);
        
        // Save to file
        try {
            fs.writeFileSync(dataPath, JSON.stringify(validRaids, null, 2));
            console.log(`Successfully saved ${validRaids.length} raids to ${dataPath}`);
        } catch (error) {
            console.error('Error saving data to file:', error);
        }
        
        return validRaids;
    } catch (error) {
        console.error("Error during scraping process:", error);
        return [];
    }
}