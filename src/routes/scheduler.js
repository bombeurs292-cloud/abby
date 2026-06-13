const express = require('express');
const schedule = require('node-schedule');
const auth = require('../middleware/auth');
const Video = require('../models/Video');
const PublicationJob = require('../models/PublicationJob');

const router = express.Router();
const scheduledJobs = {};

// Schedule video publication
router.post('/schedule', auth, async (req, res) => {
  try {
    const { videoId, platforms, scheduledFor } = req.body;

    if (!videoId || !platforms || !scheduledFor) {
      return res.status(400).json({
        success: false,
        message: 'videoId, platforms, and scheduledFor are required',
      });
    }

    const video = await Video.findOne({ _id: videoId, userId: req.userId });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const publishDate = new Date(scheduledFor);
    if (publishDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future',
      });
    }

    // Create publication jobs for each platform
    const jobs = [];
    for (const platform of platforms) {
      const job = new PublicationJob({
        videoId,
        userId: req.userId,
        platform,
        scheduledFor: publishDate,
        status: 'pending',
      });
      await job.save();
      jobs.push(job);

      // Schedule the job
      const jobKey = `${videoId}-${platform}`;
      const scheduledJob = schedule.scheduleJob(publishDate, async () => {
        console.log(`Publishing ${videoId} to ${platform}...`);
        // TODO: Implement actual publishing logic
        job.status = 'completed';
        await job.save();
      });

      scheduledJobs[jobKey] = scheduledJob;
    }

    video.status = 'scheduled';
    await video.save();

    res.status(200).json({
      success: true,
      message: 'Video scheduled successfully',
      jobs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get scheduled publications
router.get('/jobs', auth, async (req, res) => {
  try {
    const jobs = await PublicationJob.find({ userId: req.userId })
      .populate('videoId')
      .sort({ scheduledFor: -1 });

    res.status(200).json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel scheduled publication
router.post('/cancel/:jobId', auth, async (req, res) => {
  try {
    const job = await PublicationJob.findOne({
      _id: req.params.jobId,
      userId: req.userId,
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending jobs can be cancelled',
      });
    }

    // Cancel the scheduled job
    const jobKey = `${job.videoId}-${job.platform}`;
    if (scheduledJobs[jobKey]) {
      scheduledJobs[jobKey].cancel();
      delete scheduledJobs[jobKey];
    }

    job.status = 'cancelled';
    await job.save();

    res.status(200).json({ success: true, message: 'Job cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
