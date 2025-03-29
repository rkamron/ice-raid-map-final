import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertIceRaidSchema, raidFiltersSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { initScrapers } from "./scrapers";
import { setupScheduler } from "./services/scheduler";
import { geocodeLocation } from "./services/geocoder";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up the HTTP server
  const httpServer = createServer(app);
  
  // Initialize scrapers and schedule them to run
  await initScrapers();
  setupScheduler();

  // API Routes
  // Get all ICE raids (with optional filtering)
  app.get("/api/raids", async (req: Request, res: Response) => {
    try {
      // Parse query parameters for filtering
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        state: req.query.state as string | undefined,
        raidTypes: req.query.raidTypes ? (req.query.raidTypes as string).split(",") : undefined
      };
      
      // Validate filters
      const validatedFilters = raidFiltersSchema.parse(filters);
      
      // Get raids with filters
      const raids = await storage.getFilteredRaids(validatedFilters);
      
      return res.json(raids);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Failed to fetch raids" });
    }
  });

  // Get a specific raid by ID
  app.get("/api/raids/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid raid ID" });
      }
      
      const raid = await storage.getRaid(id);
      if (!raid) {
        return res.status(404).json({ message: "Raid not found" });
      }
      
      return res.json(raid);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch raid" });
    }
  });

  // Create a new raid (manual entry or API)
  app.post("/api/raids", async (req: Request, res: Response) => {
    try {
      // Validate the incoming data
      const validatedData = insertIceRaidSchema.parse(req.body);
      
      // If location coordinates not provided, geocode the location
      if (!validatedData.latitude || !validatedData.longitude) {
        try {
          const coordinates = await geocodeLocation(validatedData.location);
          if (coordinates) {
            validatedData.latitude = coordinates.latitude;
            validatedData.longitude = coordinates.longitude;
          }
        } catch (geocodeError) {
          return res.status(400).json({ 
            message: "Could not geocode the location. Please provide latitude and longitude." 
          });
        }
      }
      
      // Create the raid
      const newRaid = await storage.createRaid(validatedData);
      
      return res.status(201).json(newRaid);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Failed to create raid" });
    }
  });

  // Update an existing raid
  app.patch("/api/raids/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid raid ID" });
      }
      
      // Get the existing raid
      const existingRaid = await storage.getRaid(id);
      if (!existingRaid) {
        return res.status(404).json({ message: "Raid not found" });
      }
      
      // Validate the update data (partial validation)
      const raidData = req.body;
      
      // If location has changed, update coordinates
      if (raidData.location && raidData.location !== existingRaid.location) {
        try {
          const coordinates = await geocodeLocation(raidData.location);
          if (coordinates) {
            raidData.latitude = coordinates.latitude;
            raidData.longitude = coordinates.longitude;
          }
        } catch (geocodeError) {
          // Continue with update, but log the error
          console.error("Geocoding failed for location update:", geocodeError);
        }
      }
      
      // Update the raid
      const updatedRaid = await storage.updateRaid(id, raidData);
      
      return res.json(updatedRaid);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update raid" });
    }
  });

  // Delete a raid
  app.delete("/api/raids/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid raid ID" });
      }
      
      const success = await storage.deleteRaid(id);
      if (!success) {
        return res.status(404).json({ message: "Raid not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete raid" });
    }
  });

  // Get list of states with raids
  app.get("/api/states", async (_req: Request, res: Response) => {
    try {
      const raids = await storage.getAllRaids();
      const states = [...new Set(raids.map(raid => raid.state))].sort();
      
      return res.json(states);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch states" });
    }
  });

  // Get last updated timestamp
  app.get("/api/lastUpdated", async (_req: Request, res: Response) => {
    try {
      const raids = await storage.getAllRaids();
      if (raids.length === 0) {
        return res.json({ lastUpdated: new Date() });
      }
      
      // Find the most recent createdAt timestamp
      const lastUpdated = new Date(Math.max(...raids.map(r => new Date(r.createdAt).getTime())));
      
      return res.json({ lastUpdated });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch last updated timestamp" });
    }
  });

  // Manually trigger a scrape (could be protected by auth in production)
  app.post("/api/scrape", async (_req: Request, res: Response) => {
    try {
      await initScrapers();
      return res.json({ message: "Scrape initiated successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to initiate scrape" });
    }
  });

  return httpServer;
}
