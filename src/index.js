const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const analysisPipeline = require('./analysisPipeline');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/screenshots', express.static('screenshots'));

// In-memory job storage (in production, use Redis or database)
const jobs = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      puppeteer: 'available',
      ytdl: 'available',
      elevenlabs: process.env.ELEVENLABS_API_KEY ? 'configured' : 'mock',
      gptzero: process.env.GPTZERO_API_KEY ? 'configured' : 'fallback'
    }
  });
});

// POST /analyze - Submit YouTube URL for analysis
app.post('/analyze', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      error: 'YouTube URL is required' 
    });
  }

  // Validate YouTube URL
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  if (!youtubeRegex.test(url)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid YouTube URL format' 
    });
  }

  const jobId = uuidv4();
  
  // Initialize job status
  jobs.set(jobId, {
    id: jobId,
    status: 'processing',
    url: url,
    created_at: new Date().toISOString(),
    progress: 'Starting analysis...'
  });

  // Start async processing
  processVideoAsync(jobId, url);

  res.json({
    success: true,
    jobId: jobId,
    message: 'Analysis started',
    statusUrl: `/result/${jobId}`
  });
});

// GET /result/:id - Get analysis results
app.get('/result/:id', (req, res) => {
  const jobId = req.params.id;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ 
      success: false, 
      error: 'Job not found' 
    });
  }

  res.json(job);
});

// Async processing function
async function processVideoAsync(jobId, url) {
  try {
    console.log(`🚀 Starting analysis for job ${jobId}: ${url}`);
    
    // Update job status
    jobs.set(jobId, { 
      ...jobs.get(jobId), 
      progress: 'Processing video...' 
    });

    // Run the analysis pipeline
    const result = await analysisPipeline.processVideo(url, jobId);

    // Save result to file
    const resultsDir = path.join(__dirname, '..', 'results');
    const resultPath = path.join(resultsDir, `${jobId}.json`);
    
    // Ensure results directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

    // Update job with final result
    jobs.set(jobId, {
      id: jobId,
      status: 'completed',
      url: url,
      created_at: jobs.get(jobId).created_at,
      completed_at: new Date().toISOString(),
      result: result
    });

    console.log(`✅ Analysis completed for job ${jobId}`);

  } catch (error) {
    console.error(`❌ Analysis failed for job ${jobId}:`, error.message);
    
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'failed',
      error: error.message,
      failed_at: new Date().toISOString()
    });
  }
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 YouTube Analysis Service running on http://0.0.0.0:${PORT}`);
  console.log(`📱 Web interface: http://localhost:${PORT}`);
  console.log(`🔧 Mode: ${process.env.NODE_ENV || 'Production'} (Real APIs)`);
  console.log(`📖 API Documentation available in README.md`);
});

module.exports = app;
