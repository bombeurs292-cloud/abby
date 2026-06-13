const axios = require('axios');
const User = require('../models/User');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

class YouTubeService {
  // Upload video to YouTube
  static async uploadVideo(userId, videoData) {
    try {
      const user = await User.findById(userId);
      if (!user.platforms.youtube.connected) {
        throw new Error('YouTube not connected');
      }

      const { title, description, videoUrl, visibility, tags } = videoData;

      // TODO: Implement actual YouTube upload using youtube.insert API
      // This requires OAuth2 authentication and multipart/form-data upload
      const response = await axios.post(
        `${YOUTUBE_API_BASE}/videos?part=snippet,status`,
        {
          snippet: {
            title,
            description,
            tags: tags || [],
            categoryId: '24', // Entertainment
          },
          status: {
            privacyStatus: visibility || 'public',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.platforms.youtube.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        videoId: response.data.id,
        url: `https://youtu.be/${response.data.id}`,
        platformResponse: response.data,
      };
    } catch (error) {
      throw new Error(`YouTube upload failed: ${error.message}`);
    }
  }

  // Get video analytics
  static async getAnalytics(userId, videoId) {
    try {
      const user = await User.findById(userId);
      if (!user.platforms.youtube.connected) {
        throw new Error('YouTube not connected');
      }

      const response = await axios.get(
        `${YOUTUBE_API_BASE}/videos?part=statistics&id=${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${user.platforms.youtube.accessToken}`,
          },
        }
      );

      if (response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      return response.data.items[0].statistics;
    } catch (error) {
      throw new Error(`Failed to get YouTube analytics: ${error.message}`);
    }
  }
}

module.exports = YouTubeService;
