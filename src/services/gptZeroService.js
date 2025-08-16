const axios = require('axios');

class GPTZeroService {
  constructor() {
    this.apiKey = process.env.GPTZERO_API_KEY;
    this.baseURL = 'https://api.gptzero.me/v2';
  }

  async analyzeText(text) {
    // First try GPTZero API (as per original requirements)
    if (this.apiKey) {
      try {
        const response = await axios.post(`${this.baseURL}/predict/text`, {
          document: text
        }, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        return {
          success: true,
          ai_probability: response.data.documents[0].average_generated_prob,
          source: 'gptzero_api',
          details: {
            completely_generated_prob: response.data.documents[0].completely_generated_prob,
            overall_burstiness: response.data.documents[0].overall_burstiness
          }
        };
        
      } catch (error) {
        console.log(`⚠️  GPTZero API error: ${error.message}, falling back to local detection`);
      }
    } else {
      console.log('ℹ️  GPTZero API key not configured, using local AI detection');
    }

    // Fallback to local AI detection when GPTZero is unavailable
    return this.localAIDetection(text);
  }

  localAIDetection(text) {
    // Local pattern-based AI detection as fallback
    const aiIndicators = [
      /as an ai|artificial intelligence/i,
      /i don't have|i cannot|i'm not able to/i,
      /i'm just a|i'm an ai/i,
      /please note that|it's worth noting/i,
      /furthermore|moreover|additionally/i,
      /in conclusion|to summarize/i,
      /it is important to|it's important to/i,
      /revolutionary|transformative|cutting-edge/i,
      /paradigm shift|unprecedented/i,
      /leverage|utilize|optimize/i
    ];
    
    const humanIndicators = [
      /i think|i feel|in my opinion/i,
      /personally|honestly|frankly/i,
      /um|uh|well|you know/i,
      /gonna|wanna|gotta/i,
      /hey|hello|hi there/i,
      /awesome|cool|amazing|wow/i,
      /by the way|speaking of/i
    ];

    let aiScore = 0;
    let humanScore = 0;

    // Check AI indicators
    aiIndicators.forEach(pattern => {
      if (pattern.test(text)) aiScore += 1;
    });

    // Check human indicators
    humanIndicators.forEach(pattern => {
      if (pattern.test(text)) humanScore += 1;
    });

    // Calculate probability based on indicators
    let baseProbability = 0.3; // Base probability
    
    if (aiScore > humanScore) {
      baseProbability = 0.7 + (aiScore * 0.1);
    } else if (humanScore > aiScore) {
      baseProbability = 0.2 - (humanScore * 0.05);
    }

    // Check sentence length and complexity (AI tends to be more structured)
    const words = text.split(/\s+/).length;
    if (words > 25) baseProbability += 0.1; // Long sentences are more AI-like
    if (text.includes(';') || text.split(',').length > 3) baseProbability += 0.1; // Complex punctuation

    // Ensure probability is between 0 and 1
    const probability = Math.max(0, Math.min(1, baseProbability));

    return {
      success: true,
      ai_probability: probability,
      source: 'local_fallback',
      details: {
        ai_indicators: aiScore,
        human_indicators: humanScore,
        word_count: words,
        method: 'pattern_analysis'
      }
    };
  }

  async analyzeBatch(textArray) {
    const results = [];
    
    for (const text of textArray) {
      try {
        const result = await this.analyzeText(text);
        results.push({
          text: text,
          ...result
        });
      } catch (error) {
        results.push({
          text: text,
          success: false,
          error: error.message,
          ai_probability: 0.5 // Default fallback
        });
      }
    }
    
    return results;
  }

  getServiceStatus() {
    return {
      has_api_key: !!this.apiKey,
      base_url: this.baseURL,
      fallback_available: true,
      mode: this.apiKey ? 'api_with_fallback' : 'fallback_only'
    };
  }
}

module.exports = new GPTZeroService();
