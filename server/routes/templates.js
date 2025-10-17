const express = require('express');
const Template = require('../models/Template');
const { authenticateToken, authorize, canAccessTemplates } = require('../middleware/auth');

const router = express.Router();

// Get all templates
router.get('/', authenticateToken, canAccessTemplates, async (req, res) => {
  try {
    const { type, isActive, page = 1, limit = 10 } = req.query;

    let query = {};

    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const templates = await Template.find(query)
      .populate('createdBy', 'firstName lastName employeeId')
      .populate('lastModifiedBy', 'firstName lastName employeeId')
      .sort({ isDefault: -1, name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Template.countDocuments(query);

    res.json({
      templates,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Failed to fetch templates', error: error.message });
  }
});

// Get template by ID
router.get('/:templateId', authenticateToken, canAccessTemplates, async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await Template.findById(templateId)
      .populate('createdBy', 'firstName lastName employeeId')
      .populate('lastModifiedBy', 'firstName lastName employeeId');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: 'Failed to fetch template', error: error.message });
  }
});

// Create new template
router.post('/', authenticateToken, canAccessTemplates, async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      content,
      category,
      tags
    } = req.body;

    const createdBy = req.user._id;

    // Check if template with same name exists
    const existingTemplate = await Template.findOne({ name, type });
    if (existingTemplate) {
      return res.status(400).json({ message: 'Template with this name already exists' });
    }

    const template = new Template({
      name,
      type,
      description,
      content,
      category,
      tags,
      createdBy
    });

    // Extract variables from content
    template.extractVariables();

    await template.save();

    res.status(201).json({
      message: 'Template created successfully',
      template: {
        id: template._id,
        name: template.name,
        type: template.type,
        description: template.description,
        variables: template.variables,
        usageCount: template.usageCount
      }
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ message: 'Failed to create template', error: error.message });
  }
});

// Update template
router.put('/:templateId', authenticateToken, canAccessTemplates, async (req, res) => {
  try {
    const { templateId } = req.params;
    const {
      name,
      description,
      content,
      category,
      tags,
      isActive
    } = req.body;

    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Store previous version
    template.previousVersions.push({
      content: template.content,
      version: template.version,
      modifiedBy: req.user._id
    });

    // Update fields
    if (name) template.name = name;
    if (description) template.description = description;
    if (content) {
      template.content = content;
      // Re-extract variables
      template.extractVariables();
    }
    if (category) template.category = category;
    if (tags) template.tags = tags;
    if (isActive !== undefined) template.isActive = isActive;

    template.lastModifiedBy = req.user._id;
    template.version += 1;

    await template.save();

    res.json({
      message: 'Template updated successfully',
      template: {
        id: template._id,
        name: template.name,
        type: template.type,
        description: template.description,
        variables: template.variables,
        version: template.version,
        lastModifiedBy: req.user.fullName
      }
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ message: 'Failed to update template', error: error.message });
  }
});

// Delete template
router.delete('/:templateId', authenticateToken, canAccessTemplates, async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.isDefault) {
      return res.status(400).json({ message: 'Cannot delete default template' });
    }

    await Template.findByIdAndDelete(templateId);

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: 'Failed to delete template', error: error.message });
  }
});

// Render template with data
router.post('/:templateId/render', authenticateToken, canAccessTemplates, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { data } = req.body;

    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!template.isActive) {
      return res.status(400).json({ message: 'Template is not active' });
    }

    // Validate required variables
    const missingVariables = template.variables
      .filter(variable => variable.required && !data[variable.name])
      .map(variable => variable.name);

    if (missingVariables.length > 0) {
      return res.status(400).json({
        message: 'Missing required variables',
        missingVariables
      });
    }

    const renderedContent = template.render(data);

    res.json({
      renderedContent,
      template: {
        id: template._id,
        name: template.name,
        type: template.type
      }
    });
  } catch (error) {
    console.error('Render template error:', error);
    res.status(500).json({ message: 'Failed to render template', error: error.message });
  }
});

// Get templates by type
router.get('/type/:type', authenticateToken, canAccessTemplates, async (req, res) => {
  try {
    const { type } = req.params;
    const { isActive = true } = req.query;

    const templates = await Template.getByType(type, isActive === 'true');

    res.json({ templates });
  } catch (error) {
    console.error('Get templates by type error:', error);
    res.status(500).json({ message: 'Failed to fetch templates', error: error.message });
  }
});

// Create default templates
router.post('/create-defaults', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    await Template.createDefaultTemplates(req.user._id);

    res.json({ message: 'Default templates created successfully' });
  } catch (error) {
    console.error('Create default templates error:', error);
    res.status(500).json({ message: 'Failed to create default templates', error: error.message });
  }
});

// Duplicate template
router.post('/:templateId/duplicate', authenticateToken, canAccessTemplates, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name } = req.body;

    const originalTemplate = await Template.findById(templateId);

    if (!originalTemplate) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Check if template with same name exists
    const existingTemplate = await Template.findOne({ name, type: originalTemplate.type });
    if (existingTemplate) {
      return res.status(400).json({ message: 'Template with this name already exists' });
    }

    const newTemplate = new Template({
      name: name || `${originalTemplate.name} (Copy)`,
      type: originalTemplate.type,
      description: originalTemplate.description,
      content: originalTemplate.content,
      variables: originalTemplate.variables,
      category: originalTemplate.category,
      tags: originalTemplate.tags,
      createdBy: req.user._id
    });

    await newTemplate.save();

    res.status(201).json({
      message: 'Template duplicated successfully',
      template: {
        id: newTemplate._id,
        name: newTemplate.name,
        type: newTemplate.type,
        description: newTemplate.description
      }
    });
  } catch (error) {
    console.error('Duplicate template error:', error);
    res.status(500).json({ message: 'Failed to duplicate template', error: error.message });
  }
});

// Get template usage statistics
router.get('/:templateId/usage', authenticateToken, canAccessTemplates, async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({
      usageCount: template.usageCount,
      lastUsed: template.updatedAt,
      version: template.version,
      previousVersions: template.previousVersions.length
    });
  } catch (error) {
    console.error('Get template usage error:', error);
    res.status(500).json({ message: 'Failed to fetch template usage', error: error.message });
  }
});

module.exports = router;
