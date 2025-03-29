import { users, type User, type InsertUser, type IceRaid, type InsertIceRaid, type RaidFilters } from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // ICE Raid operations
  getRaid(id: number): Promise<IceRaid | undefined>;
  getAllRaids(): Promise<IceRaid[]>;
  getFilteredRaids(filters: RaidFilters): Promise<IceRaid[]>;
  createRaid(raid: InsertIceRaid): Promise<IceRaid>;
  updateRaid(id: number, raid: Partial<InsertIceRaid>): Promise<IceRaid | undefined>;
  deleteRaid(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private raids: Map<number, IceRaid>;
  private currentUserId: number;
  private currentRaidId: number;

  constructor() {
    this.users = new Map();
    this.raids = new Map();
    this.currentUserId = 1;
    this.currentRaidId = 1;
    
    // Initialize with sample data for demonstration
    const sampleRaids: IceRaid[] = [
      {
        id: 1,
        title: "Workplace Raid in Los Angeles",
        description: "ICE agents conducted an operation at a manufacturing facility, resulting in multiple arrests.",
        location: "Los Angeles, CA",
        state: "CA",
        latitude: "34.0522",
        longitude: "-118.2437",
        raidType: "Workplace",
        sourceType: "News",
        sourceUrl: "https://example.com/news1",
        sourceName: "Local News",
        raidDate: new Date(),
        detaineeCount: 15,
        verified: true,
        createdAt: new Date()
      },
      {
        id: 2,
        title: "Residential Raid in Phoenix",
        description: "ICE conducted early morning home visits targeting specific individuals with deportation orders.",
        location: "Phoenix, AZ",
        state: "AZ",
        latitude: "33.4484",
        longitude: "-112.0740",
        raidType: "Residential",
        sourceType: "Community Alert",
        sourceUrl: "https://example.com/news2",
        sourceName: "Community Organization",
        raidDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        detaineeCount: 3,
        verified: true,
        createdAt: new Date()
      },
      {
        id: 3,
        title: "Checkpoint Operation in El Paso",
        description: "Border Patrol and ICE established a checkpoint on Highway 10, stopping vehicles and checking documentation.",
        location: "El Paso, TX",
        state: "TX",
        latitude: "31.7619",
        longitude: "-106.4850",
        raidType: "Checkpoint",
        sourceType: "Social Media",
        sourceUrl: "https://example.com/news3",
        sourceName: "Twitter Reports",
        raidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        detaineeCount: null,
        verified: true,
        createdAt: new Date()
      }
    ];
    
    // Add sample raids to storage
    sampleRaids.forEach(raid => {
      this.raids.set(raid.id, raid);
      this.currentRaidId = Math.max(this.currentRaidId, raid.id + 1);
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // ICE Raid Methods
  async getRaid(id: number): Promise<IceRaid | undefined> {
    return this.raids.get(id);
  }

  async getAllRaids(): Promise<IceRaid[]> {
    return Array.from(this.raids.values());
  }

  async getFilteredRaids(filters: RaidFilters): Promise<IceRaid[]> {
    let results = Array.from(this.raids.values());

    // Filter by date range
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      results = results.filter(raid => new Date(raid.raidDate) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      results = results.filter(raid => new Date(raid.raidDate) <= endDate);
    }

    // Filter by state
    if (filters.state && filters.state !== "All States") {
      results = results.filter(raid => raid.state === filters.state);
    }

    // Filter by raid types
    if (filters.raidTypes && filters.raidTypes.length > 0) {
      results = results.filter(raid => filters.raidTypes?.includes(raid.raidType));
    }

    // Sort by date, most recent first
    results.sort((a, b) => new Date(b.raidDate).getTime() - new Date(a.raidDate).getTime());

    return results;
  }

  async createRaid(insertRaid: InsertIceRaid): Promise<IceRaid> {
    const id = this.currentRaidId++;
    
    // Ensure required properties have correct types
    const raid: IceRaid = { 
      ...insertRaid, 
      id, 
      createdAt: new Date(),
      detaineeCount: insertRaid.detaineeCount === undefined ? null : insertRaid.detaineeCount,
      verified: insertRaid.verified === undefined ? false : insertRaid.verified
    };
    
    this.raids.set(id, raid);
    return raid;
  }

  async updateRaid(id: number, raidUpdate: Partial<InsertIceRaid>): Promise<IceRaid | undefined> {
    const existingRaid = this.raids.get(id);
    
    if (!existingRaid) {
      return undefined;
    }

    const updatedRaid: IceRaid = {
      ...existingRaid,
      ...raidUpdate,
    };

    this.raids.set(id, updatedRaid);
    return updatedRaid;
  }

  async deleteRaid(id: number): Promise<boolean> {
    return this.raids.delete(id);
  }
}

export const storage = new MemStorage();
