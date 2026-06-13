const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    tags: [String],
    thumbnail: String,
    videoUrl: String,
    duration: Number, // in seconds
    fileSize: Number, // in bytes
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'failed'],
      default: 'draft',
    },
    platforms: {
      youtube: {
        enabled: { type: Boolean, default: false },
        visibility: {
          type: String,
          enum: ['public', 'unlisted', 'private'],
          default: 'public',
        },
        videoId: String,
        publishedAt: Date,
        url: String,
      },
      tiktok: {
        enabled: { type: Boolean, default: false },
        videoId: String,
        publishedAt: Date,
        url: String,
      },
    },
    scheduling: {
      scheduledFor: Date,
      timezone: { type: String, default: 'UTC' },
      autoPublish: { type: Boolean, default: false },
    },
    analytics: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      lastUpdated: Date,
    },
  },
  { timestamps: true }
);

// Index for faster queries
videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ status: 1 });
videoSchema.index({ 'scheduling.scheduledFor': 1 });

module.exports = mongoose.model('Video', videoSchema);
