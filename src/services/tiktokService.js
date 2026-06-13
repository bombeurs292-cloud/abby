const axios = require('axios');
const User = require('../models/User');

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v1';

class TikTokService {
  // Upload video to TikTok
  static async uploadVideo(userId, videoData) {
    try {
      const user = await User.findById(userId);
      if (!user.platforms.tiktok.connected) {
        throw new Error('TikTok not connected');
      }

      const { title, description, videoUrl, tags } = videoData;

      // TODO: Implement actual TikTok upload using TikTok API
      // This requires OAuth2 authentication and multipart upload
      const response = await axios.post(
        `${TIKTOK_API_BASE}/video/upload/`,
        {
          video: {
            source: videoUrl,
          },
          caption: `${title}\n${description}${tags ? '\n' + tags.join(' ') : ''}`,
        },
        {
          headers: {
            Authorization: `Bearer ${user.platforms.tiktok.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        videoId: response.data.data.video_id,
        url: `https://www.tiktok.com/@${user.platforms.tiktok.username}/video/${response.data.data.video_id}`,
        platformResponse: response.data,
      };
    } catch (error) {
      throw new Error(`TikTok upload failed: ${error.message}`);
    }
  }

  // Get video analytics
  static async getAnalytics(userId, videoId) {
    try {
      const user = await User.findById(userId);
      if (!user.platforms.tiktok.connected) {
        throw new Error('TikTok not connected');
      }

      const response = await axios.get(
        `${TIKTOK_API_BASE}/video/query/?ids=${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${user.platforms.tiktok.accessToken}`,
          },
        }
      );

      if (!response.data.data.videos[0]) {
        throw new Error('Video not found');
      }

      return response.data.data.videos[0].statistics;
    } catch (error) {
      throw new Error(`Failed to get TikTok analytics: ${error.message}`);
    }
  }
}

module.exports = TikTokService;
