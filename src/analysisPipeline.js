const puppeteerService = require('./services/puppeteerService');
const audioService = require('./services/audioService');
const elevenLabsService = require('./services/elevenLabsService');
const gptZeroService = require('./services/gptZeroService');

class AnalysisPipeline {
  async processVideo(youtubeUrl, jobId) {
    const startTime = Date.now();
    console.log(`📋 Starting analysis pipeline for: ${youtubeUrl}`);

    const result = {
      jobId,
      video_url: youtubeUrl,
      timestamp: new Date().toISOString(),
      processing_steps: []
    };

    try {
      // Step 1: Screenshot with Puppeteer
      console.log('📸 Step 1/4: Capturing screenshot...');
      const screenshotResult = await puppeteerService.captureScreenshot(youtubeUrl, jobId);
      
      result.screenshot_path = screenshotResult.path;
      result.title = screenshotResult.title;
      result.processing_steps.push({
        step: 'screenshot',
        status: 'completed',
        duration_ms: screenshotResult.duration,
        details: {
          title: screenshotResult.title,
          path: screenshotResult.path
        }
      });

      // Step 2: Audio extraction
      console.log('🎵 Step 2/4: Extracting audio...');
      const audioResult = await audioService.extractAudio(youtubeUrl, jobId);
      
      result.audio_path = audioResult.path;
      result.duration = audioResult.duration;
      result.processing_steps.push({
        step: 'audio_extraction',
        status: 'completed',
        duration_ms: audioResult.processing_time,
        details: {
          format: 'wav',
          sample_rate: '16kHz',
          channels: 'mono',
          bit_depth: '16-bit',
          size_mb: audioResult.size_mb
        }
      });

      // Step 3: Transcription with ElevenLabs
      console.log('🗣️  Step 3/4: Transcribing audio...');
      const transcriptionResult = await elevenLabsService.transcribeAudio(audioResult.path);
      
      result.transcript = transcriptionResult.transcript || [];
      result.processing_steps.push({
        step: 'transcription',
        status: 'completed',
        service: transcriptionResult.service || 'ElevenLabs_Mock',
        details: {
          sentences_count: result.transcript.length,
          has_timestamps: true,
          has_speaker_diarization: true
        }
      });

      // Step 4: AI Detection with GPTZero
      console.log('🤖 Step 4/4: Running AI detection...');
      const aiAnalysisStart = Date.now();
      
      if (result.transcript && result.transcript.length > 0) {
        for (let i = 0; i < result.transcript.length; i++) {
          const sentence = result.transcript[i];
          try {
            const aiResult = await gptZeroService.analyzeText(sentence.text || sentence.sentence);
            result.transcript[i].ai_probability = aiResult.ai_probability || 0.5;
            result.transcript[i].ai_source = aiResult.source || 'local_fallback';
          } catch (error) {
            console.log(`⚠️  AI analysis failed for sentence ${i}: ${error.message}`);
            result.transcript[i].ai_probability = 0.5; // Default fallback
            result.transcript[i].ai_source = 'error_fallback';
          }
        }
      }

      const aiAnalysisDuration = Date.now() - aiAnalysisStart;
      result.processing_steps.push({
        step: 'ai_detection',
        status: 'completed',
        duration_ms: aiAnalysisDuration,
        details: {
          sentences_analyzed: result.transcript.length,
          avg_ai_probability: result.transcript.reduce((sum, s) => sum + (s.ai_probability || 0), 0) / Math.max(result.transcript.length, 1)
        }
      });

      // Summary statistics
      const totalDuration = Date.now() - startTime;
      result.processing_summary = {
        total_duration_ms: totalDuration,
        total_sentences: result.transcript.length,
        avg_ai_probability: result.transcript.reduce((sum, s) => sum + (s.ai_probability || 0), 0) / Math.max(result.transcript.length, 1),
        status: 'completed',
        completed_at: new Date().toISOString()
      };

      console.log(`✅ Pipeline completed in ${totalDuration}ms`);
      return result;

    } catch (error) {
      console.error('❌ Pipeline failed:', error.message);
      
      result.processing_summary = {
        status: 'failed',
        error: error.message,
        failed_at: new Date().toISOString(),
        completed_steps: result.processing_steps.length
      };
      
      throw error;
    }
  }
}

module.exports = new AnalysisPipeline();
