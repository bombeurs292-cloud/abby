const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Connect YouTube
router.post('/youtube/connect', auth, async (req, res) => {
  try {
    const { accessToken, refreshToken, channelId, channelName } = req.body;

    if (!accessToken || !channelId) {
      return res.status(400).json({
        success: false,
        message: 'accessToken and channelId are required',
      });
    }

    const user = await User.findById(req.userId);
    user.platforms.youtube = {
      connected: true,
      accessToken,
      refreshToken,
      channelId,
      channelName,
    };

    await user.save();
    res.status(200).json({
      success: true,
      message: 'YouTube connected successfully',
      platforms: user.platforms,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Connect TikTok
router.post('/tiktok/connect', auth, async (req, res) => {
  try {
    const { accessToken, refreshToken, userId, username } = req.body;

    if (!accessToken || !userId) {
      return res.status(400).json({
        success: false,
        message: 'accessToken and userId are required',
      });
    }

    const user = await User.findById(req.userId);
    user.platforms.tiktok = {
      connected: true,
      accessToken,
      refreshToken,
      userId,
      username,
    };

    await user.save();
    res.status(200).json({
      success: true,
      message: 'TikTok connected successfully',
      platforms: user.platforms,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get platform connections
router.get('/connections', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.status(200).json({
      success: true,
      platforms: {
        youtube: {
          connected: user.platforms.youtube.connected,
          channelName: user.platforms.youtube.channelName,
        },
        tiktok: {
          connected: user.platforms.tiktok.connected,
          username: user.platforms.tiktok.username,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Disconnect platform
router.post('/disconnect/:platform', auth, async (req, res) => {
  try {
    const { platform } = req.params;

    if (!['youtube', 'tiktok'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Invalid platform' });
    }

    const user = await User.findById(req.userId);
    user.platforms[platform] = {
      connected: false,
      accessToken: null,
      refreshToken: null,
    };

    await user.save();
    res.status(200).json({
      success: true,
      message: `${platform} disconnected successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
