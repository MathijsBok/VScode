import { Request, Response, NextFunction } from 'express';
import { getAuth, clerkClient } from '@clerk/express';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user from database with role
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true }
    });

    // Auto-create user if they don't exist (for local development without webhooks)
    if (!user) {
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress || '';
        const roleFromMetadata = (clerkUser.publicMetadata?.role as string) || 'USER';
        const role = roleFromMetadata.toUpperCase() as 'USER' | 'AGENT' | 'ADMIN';

        // Use upsert to handle case where email exists but clerkId is different
        user = await prisma.user.upsert({
          where: { email },
          update: {
            clerkId: userId,
            firstName: clerkUser.firstName || null,
            lastName: clerkUser.lastName || null
          },
          create: {
            clerkId: userId,
            email,
            firstName: clerkUser.firstName || null,
            lastName: clerkUser.lastName || null,
            role
          },
          select: { id: true, role: true }
        });

        console.log(`Auto-created/updated user: ${user.id} with role ${user.role}`);
      } catch (createError) {
        console.error('Error auto-creating user:', createError);
        return res.status(401).json({ error: 'User not found and could not be created' });
      }
    }

    req.userId = user.id;
    req.userRole = user.role;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    return next();
  };
};

export const requireAgent = requireRole('AGENT', 'ADMIN');
export const requireAdmin = requireRole('ADMIN');
