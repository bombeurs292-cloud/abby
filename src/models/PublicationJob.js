const mongoose = require('mongoose');

const publicationJobSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    platform: {
      type: String,
      enum: ['youtube', 'tiktok'],
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    jobId: String, // For scheduler
    error: String,
    result: {
      videoId: String,
      url: String,
      platformResponse: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

publicationJobSchema.index({ scheduledFor: 1, status: 1 });
publicationJobSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('PublicationJob', publicationJobSchema);
