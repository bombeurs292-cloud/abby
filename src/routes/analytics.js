const express = require('express');
const auth = require('../middleware/auth');
const YouTubeService = require('../services/youtubeService');
const TikTokService = require('../services/tiktokService');

const router = express.Router();

// ==================== YOUTUBE ANALYTICS ====================

// Get YouTube channel info
router.get('/youtube/channel', auth, async (req, res) => {
  try {
    const channelInfo = await YouTubeService.getChannelInfo(req.userId);
    res.status(200).json({
      success: true,
      channel: channelInfo,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get YouTube video analytics
router.get('/youtube/video/:videoId', auth, async (req, res) => {
  try {
    const analytics = await YouTubeService.getAnalytics(req.userId, req.params.videoId);
    res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// List YouTube videos
router.get('/youtube/videos', auth, async (req, res) => {
  try {
    const { maxResults, pageToken } = req.query;
    const videos = await YouTubeService.listVideos(req.userId, {
      maxResults: parseInt(maxResults) || 25,
      pageToken,
    });
    res.status(200).json({
      success: true,
      videos,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== TIKTOK ANALYTICS ====================

// Get TikTok user info
router.get('/tiktok/user', auth, async (req, res) => {
  try {
    const userInfo = await TikTokService.getUserInfo(req.userId);
    res.status(200).json({
      success: true,
      user: userInfo,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get TikTok video analytics
router.get('/tiktok/video/:videoId', auth, async (req, res) => {
  try {
    const analytics = await TikTokService.getAnalytics(req.userId, req.params.videoId);
    res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// List TikTok videos
router.get('/tiktok/videos', auth, async (req, res) => {
  try {
    const { maxResults, cursor } = req.query;
    const videos = await TikTokService.listVideos(req.userId, {
      maxResults: parseInt(maxResults) || 10,
      cursor: parseInt(cursor) || 0,
    });
    res.status(200).json({
      success: true,
      videos,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
