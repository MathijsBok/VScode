import { Router, Response } from 'express';
import { PrismaClient, TicketStatus, TicketPriority, TicketChannel, UserRole } from '@prisma/client';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { getAuth } from '@clerk/express';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for JSON file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  }
});

// Zendesk data interfaces
interface ZendeskUser {
  id: number;
  email?: string;
  name?: string;
}

interface ZendeskComment {
  id: number;
  author_id: number;
  body?: string;
  html_body?: string;
  plain_body?: string;
  public: boolean;
  created_at?: string;
}

interface ZendeskTicket {
  id: number;
  subject?: string;
  description?: string;
  status: string;
  priority?: string;
  requester?: ZendeskUser;
  requester_id?: number;
  assignee?: ZendeskUser;
  assignee_id?: number;
  submitter?: ZendeskUser;
  comments?: ZendeskComment[];
  created_at?: string;
  updated_at?: string;
  solved_at?: string;
}

// Map Zendesk status to our status
const mapStatus = (zendeskStatus: string): TicketStatus => {
  const statusMap: Record<string, TicketStatus> = {
    'new': 'NEW',
    'open': 'OPEN',
    'pending': 'PENDING',
    'hold': 'ON_HOLD',
    'solved': 'SOLVED',
    'closed': 'SOLVED'
  };
  return statusMap[zendeskStatus.toLowerCase()] || 'NEW';
};

// Map Zendesk priority to our priority
const mapPriority = (zendeskPriority: string | null): TicketPriority => {
  if (!zendeskPriority) return 'NORMAL';
  const priorityMap: Record<string, TicketPriority> = {
    'low': 'LOW',
    'normal': 'NORMAL',
    'high': 'HIGH',
    'urgent': 'URGENT'
  };
  return priorityMap[zendeskPriority.toLowerCase()] || 'NORMAL';
};

// Parse name into first and last name
const parseName = (name?: string): { firstName: string; lastName: string } => {
  if (!name) return { firstName: 'Imported', lastName: 'User' };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

// Extract unique users from tickets
const extractUsersFromTickets = (tickets: ZendeskTicket[]): Map<number, ZendeskUser> => {
  const users = new Map<number, ZendeskUser>();

  for (const ticket of tickets) {
    if (ticket.requester) {
      users.set(ticket.requester.id, ticket.requester);
    }
    if (ticket.assignee) {
      users.set(ticket.assignee.id, ticket.assignee);
    }
    if (ticket.submitter) {
      users.set(ticket.submitter.id, ticket.submitter);
    }
    // Extract comment authors too
    for (const comment of ticket.comments || []) {
      if (comment.author_id && !users.has(comment.author_id)) {
        // We only have the ID, will need to resolve later
        users.set(comment.author_id, { id: comment.author_id });
      }
    }
  }

  return users;
};

// Import tickets from Zendesk JSON export
router.post('/import', requireAuth, requireAdmin, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer.toString().trim();

    // Parse JSON - handle multiple formats:
    // 1. JSONL format (one JSON object per line)
    // 2. Single array of tickets
    // 3. Object with { tickets: [...] } wrapper
    let tickets: ZendeskTicket[];

    try {
      // First, try parsing as single JSON
      const jsonData = JSON.parse(fileContent);

      if (Array.isArray(jsonData)) {
        tickets = jsonData;
      } else if (Array.isArray(jsonData.tickets)) {
        tickets = jsonData.tickets;
      } else if (jsonData.id && jsonData.status) {
        // Single ticket object
        tickets = [jsonData];
      } else {
        return res.status(400).json({
          error: 'Invalid Zendesk export format.'
        });
      }
    } catch {
      // JSON parse failed - try JSONL format (one JSON object per line)
      const lines = fileContent.split('\n').filter(line => line.trim());
      tickets = [];

      for (const line of lines) {
        try {
          const ticket = JSON.parse(line);
          if (ticket.id && ticket.status) {
            tickets.push(ticket);
          }
        } catch {
          // Skip invalid lines
          continue;
        }
      }

      if (tickets.length === 0) {
        return res.status(400).json({
          error: 'Invalid Zendesk export format. Could not parse any tickets from the file.'
        });
      }
    }

    let importedCount = 0;
    let skippedCount = 0;
    let createdUsersCount = 0;
    const errors: string[] = [];

    // Get the admin user who is importing
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // Extract all unique users from the tickets
    const zendeskUsers = extractUsersFromTickets(tickets);

    // Create a map of Zendesk user IDs to system user IDs
    const userMap = new Map<number, string>();
    const agentZendeskIds = new Set<number>();

    // Identify which Zendesk users are agents (assignees)
    for (const ticket of tickets) {
      if (ticket.assignee) {
        agentZendeskIds.add(ticket.assignee.id);
      }
    }

    // Match or create users
    for (const [zendeskId, zendeskUser] of zendeskUsers) {
      // First, try to match by email
      if (zendeskUser.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: zendeskUser.email }
        });

        if (existingUser) {
          userMap.set(zendeskId, existingUser.id);
          continue;
        }
      }

      // Check if we already created a user for this Zendesk ID
      const importClerkId = `zendesk-import-${zendeskId}`;
      const existingImportedUser = await prisma.user.findUnique({
        where: { clerkId: importClerkId }
      });

      if (existingImportedUser) {
        userMap.set(zendeskId, existingImportedUser.id);
        continue;
      }

      // Create a new user if we have email
      if (zendeskUser.email) {
        const { firstName, lastName } = parseName(zendeskUser.name);
        const isAgent = agentZendeskIds.has(zendeskId);

        try {
          const newUser = await prisma.user.create({
            data: {
              clerkId: importClerkId,
              email: zendeskUser.email,
              firstName,
              lastName,
              role: isAgent ? UserRole.AGENT : UserRole.USER
            }
          });
          userMap.set(zendeskId, newUser.id);
          createdUsersCount++;
        } catch (error: any) {
          // User creation failed (maybe duplicate email), use admin as fallback
          console.error(`Failed to create user for Zendesk ID ${zendeskId}:`, error.message);
          userMap.set(zendeskId, adminUser.id);
        }
      } else {
        // No email, use admin as fallback
        userMap.set(zendeskId, adminUser.id);
      }
    }

    // Process each ticket
    let duplicateCount = 0;
    for (const zendeskTicket of tickets) {
      try {
        // Check if ticket with this number already exists
        const existingTicket = await prisma.ticket.findUnique({
          where: { ticketNumber: zendeskTicket.id }
        });

        if (existingTicket) {
          duplicateCount++;
          continue; // Skip duplicate tickets
        }

        // Get requester ID - try embedded object first, then requester_id
        let requesterId = adminUser.id;
        if (zendeskTicket.requester) {
          requesterId = userMap.get(zendeskTicket.requester.id) || adminUser.id;
        } else if (zendeskTicket.requester_id) {
          requesterId = userMap.get(zendeskTicket.requester_id) || adminUser.id;
        }

        // Get assignee ID - try embedded object first, then assignee_id
        let assigneeId: string | undefined = undefined;
        if (zendeskTicket.assignee) {
          assigneeId = userMap.get(zendeskTicket.assignee.id);
        } else if (zendeskTicket.assignee_id) {
          assigneeId = userMap.get(zendeskTicket.assignee_id);
        }

        // Determine solved date
        let solvedAt: Date | undefined = undefined;
        if (zendeskTicket.solved_at) {
          solvedAt = new Date(zendeskTicket.solved_at);
        } else if (zendeskTicket.status === 'solved' || zendeskTicket.status === 'closed') {
          solvedAt = zendeskTicket.updated_at ? new Date(zendeskTicket.updated_at) : new Date();
        }

        // Create ticket with original Zendesk ticket number
        const ticket = await prisma.ticket.create({
          data: {
            ticketNumber: zendeskTicket.id,
            subject: zendeskTicket.subject || 'Imported from Zendesk',
            status: mapStatus(zendeskTicket.status),
            priority: mapPriority(zendeskTicket.priority || null),
            channel: TicketChannel.WEB,
            requesterId,
            assigneeId,
            createdAt: zendeskTicket.created_at ? new Date(zendeskTicket.created_at) : undefined,
            updatedAt: zendeskTicket.updated_at ? new Date(zendeskTicket.updated_at) : undefined,
            solvedAt
          }
        });

        // Import embedded comments (skip attachments)
        const ticketComments = zendeskTicket.comments || [];
        for (const comment of ticketComments) {
          const commentAuthorId = userMap.get(comment.author_id) || adminUser.id;

          await prisma.comment.create({
            data: {
              ticketId: ticket.id,
              authorId: commentAuthorId,
              body: comment.html_body || comment.body || 'No content',
              bodyPlain: comment.plain_body || comment.body || 'No content',
              isInternal: comment.public === false,
              isSystem: false,
              channel: 'SYSTEM',
              createdAt: comment.created_at ? new Date(comment.created_at) : undefined
            }
          });
        }

        importedCount++;
      } catch (error: any) {
        console.error(`Error importing ticket ${zendeskTicket.id}:`, error);
        errors.push(`Ticket ${zendeskTicket.id}: ${error.message}`);
        skippedCount++;
      }
    }

    return res.json({
      success: true,
      imported: importedCount,
      duplicates: duplicateCount,
      skipped: skippedCount,
      usersCreated: createdUsersCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Return max 10 errors
    });

  } catch (error: any) {
    console.error('Error importing Zendesk data:', error);
    return res.status(500).json({
      error: 'Failed to import Zendesk data',
      details: error.message
    });
  }
});

// Zendesk user data interface
interface ZendeskUserImport {
  id: number;
  email: string;
  name?: string;
  role: string;
  created_at?: string;
  last_login_at?: string;
  time_zone?: string;
  iana_time_zone?: string;
}

// Convert IANA timezone to UTC offset string
const getTimezoneOffset = (ianaTimezone?: string): string | null => {
  if (!ianaTimezone) return null;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      timeZoneName: 'shortOffset'
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    return offsetPart?.value || ianaTimezone;
  } catch {
    return ianaTimezone; // Return original if conversion fails
  }
};

// Map Zendesk role to our UserRole
const mapUserRole = (zendeskRole: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    'admin': UserRole.ADMIN,
    'agent': UserRole.AGENT,
    'end-user': UserRole.USER
  };
  return roleMap[zendeskRole.toLowerCase()] || UserRole.USER;
};

// Import users from Zendesk JSON export
router.post('/import-users', requireAuth, requireAdmin, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer.toString().trim();

    // Parse JSON - handle JSONL format (one user per line) or array
    let users: ZendeskUserImport[];

    try {
      const jsonData = JSON.parse(fileContent);
      if (Array.isArray(jsonData)) {
        users = jsonData;
      } else if (jsonData.users && Array.isArray(jsonData.users)) {
        users = jsonData.users;
      } else if (jsonData.id && jsonData.email) {
        users = [jsonData];
      } else {
        return res.status(400).json({
          error: 'Invalid user export format.'
        });
      }
    } catch {
      // Try JSONL format
      const lines = fileContent.split('\n').filter(line => line.trim());
      users = [];

      for (const line of lines) {
        try {
          const user = JSON.parse(line);
          if (user.id && user.email) {
            users.push(user);
          }
        } catch {
          continue;
        }
      }

      if (users.length === 0) {
        return res.status(400).json({
          error: 'Invalid user export format. Could not parse any users from the file.'
        });
      }
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const zendeskUser of users) {
      try {
        if (!zendeskUser.email) {
          skippedCount++;
          errors.push(`User ${zendeskUser.id}: No email address`);
          continue;
        }

        // Parse name into first and last
        const { firstName, lastName } = parseName(zendeskUser.name);

        // Get timezone with UTC offset
        const timezone = getTimezoneOffset(zendeskUser.iana_time_zone);

        // Check if user already exists by email
        const existingUser = await prisma.user.findUnique({
          where: { email: zendeskUser.email }
        });

        if (existingUser) {
          // Update existing user with new fields
          await prisma.user.update({
            where: { email: zendeskUser.email },
            data: {
              firstName: firstName || existingUser.firstName,
              lastName: lastName || existingUser.lastName,
              timezone: timezone || existingUser.timezone,
              lastSeenAt: zendeskUser.last_login_at ? new Date(zendeskUser.last_login_at) : existingUser.lastSeenAt
            }
          });
          updatedCount++;
          continue;
        }

        // Check if we already have a zendesk-import user for this ID
        const importClerkId = `zendesk-import-${zendeskUser.id}`;
        const existingImportedUser = await prisma.user.findUnique({
          where: { clerkId: importClerkId }
        });

        if (existingImportedUser) {
          // Update existing imported user
          await prisma.user.update({
            where: { clerkId: importClerkId },
            data: {
              firstName,
              lastName,
              timezone,
              lastSeenAt: zendeskUser.last_login_at ? new Date(zendeskUser.last_login_at) : undefined
            }
          });
          updatedCount++;
          continue;
        }

        // Create new user
        await prisma.user.create({
          data: {
            clerkId: importClerkId,
            email: zendeskUser.email,
            firstName,
            lastName,
            role: mapUserRole(zendeskUser.role),
            timezone,
            lastSeenAt: zendeskUser.last_login_at ? new Date(zendeskUser.last_login_at) : undefined,
            createdAt: zendeskUser.created_at ? new Date(zendeskUser.created_at) : undefined
          }
        });
        importedCount++;

      } catch (error: any) {
        console.error(`Error importing user ${zendeskUser.id}:`, error);
        errors.push(`User ${zendeskUser.id}: ${error.message}`);
        skippedCount++;
      }
    }

    return res.json({
      success: true,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });

  } catch (error: any) {
    console.error('Error importing user data:', error);
    return res.status(500).json({
      error: 'Failed to import user data',
      details: error.message
    });
  }
});

export default router;
