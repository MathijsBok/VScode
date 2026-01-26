import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all forms (public endpoint for users creating tickets)
router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const forms = await prisma.form.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        formFields: {
          include: {
            field: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    return res.json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    return res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// Get single form
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        formFields: {
          include: {
            field: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    return res.json(form);
  } catch (error) {
    console.error('Error fetching form:', error);
    return res.status(500).json({ error: 'Failed to fetch form' });
  }
});

// Create new form (admin only)
router.post('/',
  requireAuth,
  requireAdmin,
  [
    body('name').isString().notEmpty(),
    body('description').optional().isString(),
    body('fieldIds').optional().isArray(),
    body('fieldIds.*').optional().isUUID(),
    body('isActive').optional().isBoolean()
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, fieldIds, isActive } = req.body;

      // Create form with field associations in a transaction
      const form = await prisma.$transaction(async (tx) => {
        const newForm = await tx.form.create({
          data: {
            name,
            description: description || null,
            isActive: isActive !== undefined ? isActive : true
          }
        });

        // Create FormField associations if fieldIds provided
        if (fieldIds && Array.isArray(fieldIds) && fieldIds.length > 0) {
          await tx.formField.createMany({
            data: fieldIds.map((fieldId: string, index: number) => ({
              formId: newForm.id,
              fieldId,
              order: index
            }))
          });
        }

        // Fetch form with fields
        return await tx.form.findUnique({
          where: { id: newForm.id },
          include: {
            formFields: {
              include: {
                field: true
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        });
      });

      return res.status(201).json(form);
    } catch (error) {
      console.error('Error creating form:', error);
      return res.status(500).json({ error: 'Failed to create form' });
    }
  }
);

// Update form (admin only)
router.patch('/:id',
  requireAuth,
  requireAdmin,
  [
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('fieldIds').optional().isArray(),
    body('fieldIds.*').optional().isUUID(),
    body('isActive').optional().isBoolean()
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { name, description, fieldIds, isActive } = req.body;

      const form = await prisma.$transaction(async (tx) => {
        // Update form basic info
        await tx.form.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(isActive !== undefined && { isActive }),
            updatedAt: new Date()
          }
        });

        // Update field associations if fieldIds provided
        if (fieldIds !== undefined && Array.isArray(fieldIds)) {
          // Delete existing field associations
          await tx.formField.deleteMany({
            where: { formId: id }
          });

          // Create new associations
          if (fieldIds.length > 0) {
            await tx.formField.createMany({
              data: fieldIds.map((fieldId: string, index: number) => ({
                formId: id,
                fieldId,
                order: index
              }))
            });
          }
        }

        // Fetch form with updated fields
        return await tx.form.findUnique({
          where: { id },
          include: {
            formFields: {
              include: {
                field: true
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        });
      });

      return res.json(form);
    } catch (error) {
      console.error('Error updating form:', error);
      return res.status(500).json({ error: 'Failed to update form' });
    }
  }
);

// Delete form (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.form.delete({
      where: { id }
    });

    return res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    return res.status(500).json({ error: 'Failed to delete form' });
  }
});

export default router;
