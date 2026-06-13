const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const Video = require('../models/Video');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get all videos for user
router.get('/', auth, async (req, res) => {
  try {
    const { status, platform } = req.query;
    const query = { userId: req.userId };

    if (status) query.status = status;
    if (platform) query[`platforms.${platform}.enabled`] = true;

    const videos = await Video.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, videos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single video
router.get('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findOne({ _id: req.params.id, userId: req.userId });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    res.status(200).json({ success: true, video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create video
router.post(
  '/',
  auth,
  [
    body('title', 'Title is required').notEmpty(),
    body('description').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, description, tags, platforms } = req.body;

      const video = new Video({
        userId: req.userId,
        title,
        description,
        tags: tags || [],
        platforms: platforms || { youtube: { enabled: false }, tiktok: { enabled: false } },
      });

      await video.save();
      res.status(201).json({ success: true, message: 'Video created', video });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Update video
router.put(
  '/:id',
  auth,
  [
    body('title').optional().notEmpty(),
    body('description').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      let video = await Video.findOne({ _id: req.params.id, userId: req.userId });
      if (!video) {
        return res.status(404).json({ success: false, message: 'Video not found' });
      }

      const { title, description, tags, platforms, status, scheduling } = req.body;
      if (title) video.title = title;
      if (description) video.description = description;
      if (tags) video.tags = tags;
      if (platforms) video.platforms = { ...video.platforms, ...platforms };
      if (status) video.status = status;
      if (scheduling) video.scheduling = { ...video.scheduling, ...scheduling };

      await video.save();
      res.status(200).json({ success: true, message: 'Video updated', video });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Delete video
router.delete('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    res.status(200).json({ success: true, message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
