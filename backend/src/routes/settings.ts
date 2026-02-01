import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin, requireAgent } from '../middleware/auth';
import { refreshKnowledgeCache } from '../services/aiService';

const router = Router();
const prisma = new PrismaClient();

// Get settings (create default if doesn't exist)
router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    let settings = await prisma.settings.findFirst();

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.settings.create({
        data: {}
      });
    }

    return res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get AI settings status (for agents)
router.get('/ai-status', requireAuth, requireAgent, async (_req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    return res.json({
      enabled: settings?.aiSummaryEnabled ?? false,
      configured: !!(settings?.anthropicApiKey)
    });
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return res.status(500).json({ error: 'Failed to fetch AI settings' });
  }
});

// Get agent page permissions (for agents to know which pages they can access)
// NOTE: When adding new admin pages, add them here with default false
router.get('/agent-permissions', requireAuth, async (_req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    return res.json({
      canAccessAnalytics: settings?.agentCanAccessAnalytics ?? true,
      canAccessForms: settings?.agentCanAccessForms ?? true,
      canAccessFieldLibrary: settings?.agentCanAccessFieldLibrary ?? true,
      canAccessMacros: settings?.agentCanAccessMacros ?? true,
      canAccessBugReports: settings?.agentCanAccessBugReports ?? true,
      canAccessEmailTemplates: settings?.agentCanAccessEmailTemplates ?? false,
      canAccessUsers: settings?.agentCanAccessUsers ?? false,
      canCreateTickets: settings?.agentCanCreateTickets ?? true
    });
  } catch (error) {
    console.error('Error fetching agent permissions:', error);
    return res.status(500).json({ error: 'Failed to fetch agent permissions' });
  }
});

// Update settings
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate numeric fields
    if (updateData.pendingTicketReminderHours !== undefined && updateData.pendingTicketReminderHours < 1) {
      return res.status(400).json({ error: 'Pending ticket reminder hours must be at least 1' });
    }

    if (updateData.autoCloseHours !== undefined && updateData.autoCloseHours < 1) {
      return res.status(400).json({ error: 'Auto-close hours must be at least 1' });
    }

    if (updateData.autoSolveHours !== undefined && updateData.autoSolveHours < 1) {
      return res.status(400).json({ error: 'Auto-solve hours must be at least 1' });
    }

    const settings = await prisma.settings.update({
      where: { id },
      data: updateData
    });

    return res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Refresh AI knowledge cache
router.post('/refresh-knowledge-cache', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const settings = await prisma.settings.findFirst();

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    if (!settings.aiKnowledgeUrls) {
      return res.status(400).json({ error: 'No knowledge URLs configured' });
    }

    const content = await refreshKnowledgeCache(settings.id, settings.aiKnowledgeUrls);

    return res.json({
      success: true,
      cacheLength: content?.length ?? 0,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing knowledge cache:', error);
    return res.status(500).json({ error: 'Failed to refresh knowledge cache' });
  }
});

export default router;
