const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// YouTube OAuth2 configuration
const YOUTUBE_CONFIG = {
  clientId: process.env.YOUTUBE_CLIENT_ID,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  redirectUri: `${process.env.APP_URL || 'http://localhost:5000'}/api/oauth/youtube/callback`,
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  revokeUrl: 'https://oauth2.googleapis.com/revoke',
  scope: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
  ],
};

// TikTok OAuth2 configuration
const TIKTOK_CONFIG = {
  clientId: process.env.TIKTOK_API_KEY,
  clientSecret: process.env.TIKTOK_API_SECRET,
  redirectUri: `${process.env.APP_URL || 'http://localhost:5000'}/api/oauth/tiktok/callback`,
  authUrl: 'https://www.tiktok.com/v1/oauth/authorize',
  tokenUrl: 'https://open.tiktokapis.com/v1/oauth/token',
  revokeUrl: 'https://open.tiktokapis.com/v1/oauth/revoke',
  scope: ['user.info.basic', 'video.upload'],
};

// ==================== YOUTUBE OAUTH2 ====================

// Step 1: Redirect user to YouTube authorization page
router.get('/youtube/authorize', (req, res) => {
  try {
    const state = Buffer.from(JSON.stringify({ type: 'youtube', timestamp: Date.now() })).toString(
      'base64'
    );

    const authUrl = new URL(YOUTUBE_CONFIG.authUrl);
    authUrl.searchParams.append('client_id', YOUTUBE_CONFIG.clientId);
    authUrl.searchParams.append('redirect_uri', YOUTUBE_CONFIG.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', YOUTUBE_CONFIG.scope.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', state);

    res.redirect(authUrl.toString());
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Step 2: Handle YouTube callback
router.get('/youtube/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: `YouTube authorization failed: ${error}`,
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'No authorization code received',
      });
    }

    // Verify state parameter
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      if (stateData.type !== 'youtube') {
        throw new Error('Invalid state');
      }
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid state parameter' });
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(YOUTUBE_CONFIG.tokenUrl, {
      code,
      client_id: YOUTUBE_CONFIG.clientId,
      client_secret: YOUTUBE_CONFIG.clientSecret,
      redirect_uri: YOUTUBE_CONFIG.redirectUri,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // Get user's YouTube channel info
    const channelResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const channel = channelResponse.data.items[0];
    const channelId = channel.id;
    const channelName = channel.snippet.title;

    // Store tokens in localStorage on frontend and redirect
    const redirectUrl = new URL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/youtube/success`);
    redirectUrl.searchParams.append('access_token', access_token);
    redirectUrl.searchParams.append('refresh_token', refresh_token);
    redirectUrl.searchParams.append('channel_id', channelId);
    redirectUrl.searchParams.append('channel_name', channelName);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('YouTube callback error:', error);
    const errorUrl = new URL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/youtube/error`);
    errorUrl.searchParams.append('error', error.message);
    res.redirect(errorUrl.toString());
  }
});

// Step 3: Store YouTube tokens (called from frontend after successful redirect)
router.post('/youtube/store', auth, async (req, res) => {
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
      refreshToken: refreshToken || null,
      channelId,
      channelName: channelName || 'Unknown',
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

// Refresh YouTube access token
router.post('/youtube/refresh-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user.platforms.youtube.refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'No refresh token available',
      });
    }

    const tokenResponse = await axios.post(YOUTUBE_CONFIG.tokenUrl, {
      client_id: YOUTUBE_CONFIG.clientId,
      client_secret: YOUTUBE_CONFIG.clientSecret,
      refresh_token: user.platforms.youtube.refreshToken,
      grant_type: 'refresh_token',
    });

    user.platforms.youtube.accessToken = tokenResponse.data.access_token;
    if (tokenResponse.data.refresh_token) {
      user.platforms.youtube.refreshToken = tokenResponse.data.refresh_token;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: tokenResponse.data.access_token,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== TIKTOK OAUTH2 ====================

// Step 1: Redirect user to TikTok authorization page
router.get('/tiktok/authorize', (req, res) => {
  try {
    const state = Buffer.from(JSON.stringify({ type: 'tiktok', timestamp: Date.now() })).toString(
      'base64'
    );

    const authUrl = new URL(TIKTOK_CONFIG.authUrl);
    authUrl.searchParams.append('client_key', TIKTOK_CONFIG.clientId);
    authUrl.searchParams.append('redirect_uri', TIKTOK_CONFIG.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', TIKTOK_CONFIG.scope.join(','));
    authUrl.searchParams.append('state', state);

    res.redirect(authUrl.toString());
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Step 2: Handle TikTok callback
router.get('/tiktok/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: `TikTok authorization failed: ${error}`,
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'No authorization code received',
      });
    }

    // Verify state parameter
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      if (stateData.type !== 'tiktok') {
        throw new Error('Invalid state');
      }
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid state parameter' });
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(TIKTOK_CONFIG.tokenUrl, {
      client_key: TIKTOK_CONFIG.clientId,
      client_secret: TIKTOK_CONFIG.clientSecret,
      code,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, open_id } = tokenResponse.data.data;

    // Get user info from TikTok
    const userResponse = await axios.get(
      'https://open.tiktokapis.com/v1/user/info/?fields=open_id,union_id,display_name',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { display_name } = userResponse.data.data.user;

    // Store tokens in localStorage on frontend and redirect
    const redirectUrl = new URL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/tiktok/success`);
    redirectUrl.searchParams.append('access_token', access_token);
    redirectUrl.searchParams.append('refresh_token', refresh_token);
    redirectUrl.searchParams.append('user_id', open_id);
    redirectUrl.searchParams.append('username', display_name);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('TikTok callback error:', error);
    const errorUrl = new URL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/tiktok/error`);
    errorUrl.searchParams.append('error', error.message);
    res.redirect(errorUrl.toString());
  }
});

// Step 3: Store TikTok tokens (called from frontend after successful redirect)
router.post('/tiktok/store', auth, async (req, res) => {
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
      refreshToken: refreshToken || null,
      userId,
      username: username || 'Unknown',
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

// Refresh TikTok access token
router.post('/tiktok/refresh-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user.platforms.tiktok.refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'No refresh token available',
      });
    }

    const tokenResponse = await axios.post(TIKTOK_CONFIG.tokenUrl, {
      client_key: TIKTOK_CONFIG.clientId,
      client_secret: TIKTOK_CONFIG.clientSecret,
      refresh_token: user.platforms.tiktok.refreshToken,
      grant_type: 'refresh_token',
    });

    user.platforms.tiktok.accessToken = tokenResponse.data.data.access_token;
    if (tokenResponse.data.data.refresh_token) {
      user.platforms.tiktok.refreshToken = tokenResponse.data.data.refresh_token;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: tokenResponse.data.data.access_token,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Revoke YouTube access
router.post('/youtube/revoke', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user.platforms.youtube.connected) {
      return res.status(400).json({
        success: false,
        message: 'YouTube not connected',
      });
    }

    // Revoke token from Google
    await axios.post(YOUTUBE_CONFIG.revokeUrl, null, {
      params: {
        token: user.platforms.youtube.accessToken,
      },
    });

    user.platforms.youtube = {
      connected: false,
      accessToken: null,
      refreshToken: null,
      channelId: null,
      channelName: null,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'YouTube access revoked',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Revoke TikTok access
router.post('/tiktok/revoke', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user.platforms.tiktok.connected) {
      return res.status(400).json({
        success: false,
        message: 'TikTok not connected',
      });
    }

    // Revoke token from TikTok
    await axios.post(
      TIKTOK_CONFIG.revokeUrl,
      {
        open_id: user.platforms.tiktok.userId,
      },
      {
        headers: {
          Authorization: `Bearer ${user.platforms.tiktok.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    user.platforms.tiktok = {
      connected: false,
      accessToken: null,
      refreshToken: null,
      userId: null,
      username: null,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'TikTok access revoked',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
