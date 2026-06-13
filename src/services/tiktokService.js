const axios = require('axios');
const User = require('../models/User');

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v1';

class TikTokService {
  // Check if token is expired and refresh if needed
  static async ensureValidToken(userId) {
    try {
      const user = await User.findById(userId);
      if (!user.platforms.tiktok.connected) {
        throw new Error('TikTok not connected');
      }

      // Try a simple API call to check if token is valid
      try {
        await axios.get(`${TIKTOK_API_BASE}/user/info/?fields=open_id,union_id,display_name`, {
          headers: {
            Authorization: `Bearer ${user.platforms.tiktok.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Token might be expired, try to refresh
        if (error.response?.status === 401 && user.platforms.tiktok.refreshToken) {
          await this.refreshToken(userId);
          // Recursively call to get fresh token
          return await this.ensureValidToken(userId);
        }
        throw error;
      }

      return user.platforms.tiktok.accessToken;
    } catch (error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  // Refresh TikTok token
  static async refreshToken(userId) {
    try {
      const user = await User.findById(userId);
      if (!user.platforms.tiktok.refreshToken) {
        throw new Error('No refresh token available');
      }

      const tokenResponse = await axios.post(`${TIKTOK_API_BASE}/oauth/token/`, {
        client_key: process.env.TIKTOK_API_KEY,
        client_secret: process.env.TIKTOK_API_SECRET,
        refresh_token: user.platforms.tiktok.refreshToken,
        grant_type: 'refresh_token',
      });

      user.platforms.tiktok.accessToken = tokenResponse.data.data.access_token;
      if (tokenResponse.data.data.refresh_token) {
        user.platforms.tiktok.refreshToken = tokenResponse.data.data.refresh_token;
      }

      await user.save();
      return tokenResponse.data.data.access_token;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Upload video to TikTok
  static async uploadVideo(userId, videoData) {
    try {
      const accessToken = await this.ensureValidToken(userId);
      const { title, description, tags, videoUrl } = videoData;

      // First, initialize upload
      const initResponse = await axios.post(
        `${TIKTOK_API_BASE}/video/upload/init/`,
        {
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: 0, // Will be updated
          },
          post_info: {
            title: title,
            description: description || '',
            disable_comment: false,
            disable_duet: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 0,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const uploadToken = initResponse.data.data.upload_token;
      const uploadUrl = initResponse.data.data.upload_url;

      // Note: Actual file upload to uploadUrl would go here
      // This is a simplified version

      return {
        videoId: uploadToken,
        uploadToken,
        uploadUrl,
        platformResponse: initResponse.data,
      };
    } catch (error) {
      throw new Error(`TikTok upload failed: ${error.message}`);
    }
  }

  // Complete video upload
  static async completeUpload(userId, uploadToken) {
    try {
      const accessToken = await this.ensureValidToken(userId);

      const response = await axios.post(
        `${TIKTOK_API_BASE}/video/upload/status/`,
        {
          upload_token: uploadToken,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to complete upload: ${error.message}`);
    }
  }

  // Get video analytics
  static async getAnalytics(userId, videoId) {
    try {
      const accessToken = await this.ensureValidToken(userId);

      const response = await axios.get(
        `${TIKTOK_API_BASE}/video/query/?ids=${videoId}&fields=id,create_time,view_count,like_count,comment_count,share_count`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.data.videos || response.data.data.videos.length === 0) {
        throw new Error('Video not found');
      }

      const video = response.data.data.videos[0];
      return {
        viewCount: video.view_count,
        likeCount: video.like_count,
        commentCount: video.comment_count,
        shareCount: video.share_count,
      };
    } catch (error) {
      throw new Error(`Failed to get TikTok analytics: ${error.message}`);
    }
  }

  // Get user info
  static async getUserInfo(userId) {
    try {
      const accessToken = await this.ensureValidToken(userId);

      const response = await axios.get(
        `${TIKTOK_API_BASE}/user/info/?fields=open_id,union_id,display_name,avatar_url,follower_count,following_count,video_count,heart_count`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data.user;
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  // List user's videos
  static async listVideos(userId, options = {}) {
    try {
      const accessToken = await this.ensureValidToken(userId);
      const { maxResults = 10, cursor = 0 } = options;

      const response = await axios.get(
        `${TIKTOK_API_BASE}/video/list/?fields=id,create_time,view_count,like_count&max_count=${maxResults}&cursor=${cursor}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to list videos: ${error.message}`);
    }
  }
}

module.exports = TikTokService;
