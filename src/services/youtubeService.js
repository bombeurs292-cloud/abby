const express = require('express');
const axios = require('axios');
const User = require('../models/User');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

class YouTubeService {
  // Check if token is expired and refresh if needed
  static async ensureValidToken(userId) {
    try {
      const user = await User.findById(userId);
      if (!user.platforms.youtube.connected) {
        throw new Error('YouTube not connected');
      }

      // Try a simple API call to check if token is valid
      try {
        await axios.get(`${YOUTUBE_API_BASE}/channels?part=snippet&mine=true`, {
          headers: {
            Authorization: `Bearer ${user.platforms.youtube.accessToken}`,
          },
        });
      } catch (error) {
        // Token might be expired, try to refresh
        if (error.response?.status === 401 && user.platforms.youtube.refreshToken) {
          await this.refreshToken(userId);
          // Recursively call to get fresh token
          return await this.ensureValidToken(userId);
        }
        throw error;
      }

      return user.platforms.youtube.accessToken;
    } catch (error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  // Refresh YouTube token
  static async refreshToken(userId) {
    try {
      const user = await User.findById(userId);
      if (!user.platforms.youtube.refreshToken) {
        throw new Error('No refresh token available');
      }

      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        refresh_token: user.platforms.youtube.refreshToken,
        grant_type: 'refresh_token',
      });

      user.platforms.youtube.accessToken = tokenResponse.data.access_token;
      if (tokenResponse.data.refresh_token) {
        user.platforms.youtube.refreshToken = tokenResponse.data.refresh_token;
      }

      await user.save();
      return tokenResponse.data.access_token;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Upload video to YouTube
  static async uploadVideo(userId, videoData, videoFilePath) {
    try {
      const accessToken = await this.ensureValidToken(userId);
      const { title, description, tags, visibility } = videoData;

      const response = await axios.post(
        `${YOUTUBE_API_BASE}/videos?part=snippet,status`,
        {
          snippet: {
            title,
            description,
            tags: tags || [],
            categoryId: '24', // Entertainment
            defaultLanguage: 'en',
          },
          status: {
            privacyStatus: visibility || 'public',
            embeddable: true,
            license: 'creativeCommon',
          },
          processingDetails: {
            processingProgress: {
              partsProcessed: 0,
              partsTotal: 0,
              timeLeftMs: 0,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
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
      const accessToken = await this.ensureValidToken(userId);

      const response = await axios.get(
        `${YOUTUBE_API_BASE}/videos?part=statistics&id=${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
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

  // Get channel info
  static async getChannelInfo(userId) {
    try {
      const accessToken = await this.ensureValidToken(userId);

      const response = await axios.get(`${YOUTUBE_API_BASE}/channels?part=snippet,statistics&mine=true`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.items[0];
    } catch (error) {
      throw new Error(`Failed to get channel info: ${error.message}`);
    }
  }

  // List user's videos
  static async listVideos(userId, options = {}) {
    try {
      const accessToken = await this.ensureValidToken(userId);
      const { maxResults = 25, pageToken = null } = options;

      const response = await axios.get(
        `${YOUTUBE_API_BASE}/search?part=snippet&mine=true&type=video&maxResults=${maxResults}${
          pageToken ? `&pageToken=${pageToken}` : ''
        }`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to list videos: ${error.message}`);
    }
  }
}

module.exports = YouTubeService;
