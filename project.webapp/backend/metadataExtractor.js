// Enhanced metadata extraction functions
const extractAuthor = (html, content) => {
  // Try multiple author extraction methods
  const authorPatterns = [
    /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']og:author["'][^>]*content=["']([^"']+)["']/i,
    /<span[^>]*class=["'][^"']*author[^"']*["'][^>]*>([^<]+)<\/span>/i,
    /<div[^>]*class=["'][^"']*author[^"']*["'][^>]*>([^<]+)<\/div>/i,
    /<p[^>]*class=["'][^"']*author[^"']*["'][^>]*>([^<]+)<\/p>/i,
    /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /author[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /written\s+by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
  ];
  
  // First try HTML patterns
  for (const pattern of authorPatterns) {
    const match = html.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      return match[1].trim();
    }
  }
  
  // Try to extract from JSON-LD schema
  const schemaMatch = html.match(/"author":\s*{[^}]*"name":\s*"([^"]+)"/i);
  if (schemaMatch) {
    return schemaMatch[1].trim();
  }
  
  // Try content-based patterns
  const contentPatterns = [
    /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /author[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /written\s+by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
  ];
  
  for (const pattern of contentPatterns) {
    const match = content.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      return match[1].trim();
    }
  }
  
  return 'Unknown';
};

const extractPublishDate = (html, content) => {
  console.log('[Metadata Extractor] Starting date extraction...');
  console.log('[Metadata Extractor] HTML length:', html ? html.length : 0);
  console.log('[Metadata Extractor] Content length:', content ? content.length : 0);
  
  // Try to extract from meta tags first
  const metaPatterns = [
    /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']og:updated_time["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']og:published_time["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']publish_date["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']date["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']pubdate["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']lastmod["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']modified["'][^>]*content=["']([^"']+)["']/i
  ];

  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      console.log('[Metadata Extractor] Found meta tag date:', match[1]);
      try {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          const result = date.toISOString().split('T')[0];
          console.log('[Metadata Extractor] Extracted date from meta tag:', result);
          return result;
        }
      } catch (e) {
        console.log('[Metadata Extractor] Error parsing meta tag date:', e.message);
        // Continue to next pattern
      }
    }
  }

  // Try to extract from JSON-LD schema
  const schemaPatterns = [
    /"datePublished":\s*"([^"]+)"/i,
    /"dateCreated":\s*"([^"]+)"/i,
    /"dateModified":\s*"([^"]+)"/i,
    /"publishedTime":\s*"([^"]+)"/i,
    /"createdTime":\s*"([^"]+)"/i
  ];

  for (const pattern of schemaPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      console.log('[Metadata Extractor] Found JSON-LD date:', match[1]);
      try {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          const result = date.toISOString().split('T')[0];
          console.log('[Metadata Extractor] Extracted date from JSON-LD:', result);
          return result;
        }
      } catch (e) {
        console.log('[Metadata Extractor] Error parsing JSON-LD date:', e.message);
        // Continue to next pattern
      }
    }
  }

  // Try to extract from HTML time tags
  const timePatterns = [
    /<time[^>]*datetime=["']([^"']+)["'][^>]*>/i,
    /<time[^>]*pubdate[^>]*>([^<]+)<\/time>/i
  ];

  for (const pattern of timePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  // Try to extract from content patterns (common date formats)
  const contentPatterns = [
    /published\s+(?:on\s+)?([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /published\s+(?:on\s+)?(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i,
    /published\s+(?:on\s+)?(\d{4}-\d{2}-\d{2})/i,
    /date:\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /date:\s*(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i,
    /date:\s*(\d{4}-\d{2}-\d{2})/i
  ];

  for (const pattern of contentPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      try {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  // If no date found, return null instead of current date
  console.log('[Metadata Extractor] No date found, returning null');
  return null;
};

const extractKeywords = (html, content) => {
  // First try to extract existing keywords meta tag
  const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
  if (keywordsMatch) {
    return keywordsMatch[1].split(',').map(k => k.trim()).filter(k => k.length > 0);
  }
  
  // AI-friendly keyword patterns that increase AI visibility
  const aiFriendlyPatterns = [
    // Technical terms that AI models recognize well
    /(?:artificial intelligence|ai|machine learning|ml|deep learning|neural networks|nlp|natural language processing)/gi,
    /(?:data science|analytics|insights|metrics|performance|optimization|efficiency|automation)/gi,
    /(?:cloud computing|saas|platform|integration|api|workflow|pipeline|architecture)/gi,
    /(?:business intelligence|reporting|dashboard|visualization|trends|patterns|correlations)/gi,
    /(?:digital transformation|innovation|technology|solution|strategy|implementation|deployment)/gi,
    /(?:user experience|ux|interface|design|usability|accessibility|responsive|mobile)/gi,
    /(?:security|compliance|governance|risk|audit|monitoring|alerting|incident)/gi,
    /(?:scalability|performance|reliability|availability|backup|recovery|disaster)/gi
  ];
  
  // Extract AI-friendly technical terms
  const aiTechnicalTerms = [];
  aiFriendlyPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      aiTechnicalTerms.push(...matches.map(m => m.toLowerCase()));
    }
  });
  
  // Extract meaningful keywords from content using NLP-like approach
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && word.length < 15)
    .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other', 'about', 'many', 'then', 'them', 'these', 'some', 'what', 'when', 'where', 'your', 'very', 'just', 'into', 'than', 'more', 'only', 'over', 'such', 'most', 'even', 'make', 'like', 'through', 'back', 'years', 'after', 'first', 'good', 'well', 'should', 'because', 'those', 'people', 'work', 'still', 'take', 'every', 'here', 'think', 'also', 'around', 'another', 'came', 'come', 'work', 'three', 'word', 'without', 'before', 'life', 'always', 'those', 'both', 'paper', 'together', 'got', 'group', 'often', 'run', 'important', 'until', 'children', 'side', 'feet', 'car', 'mile', 'night', 'walk', 'white', 'sea', 'began', 'grow', 'took', 'river', 'four', 'carry', 'state', 'once', 'book', 'hear', 'stop', 'without', 'second', 'later', 'miss', 'idea', 'enough', 'eat', 'face', 'watch', 'far', 'Indian', 'real', 'almost', 'let', 'above', 'girl', 'sometimes', 'mountain', 'cut', 'young', 'talk', 'soon', 'list', 'song', 'being', 'leave', 'family', 'it\'s'].includes(word));
  
  // Count word frequency with AI-friendly boosting
  const wordCount = {};
  words.forEach(word => {
    let score = 1;
    // Boost AI-friendly technical terms
    if (aiTechnicalTerms.includes(word)) score += 3;
    // Boost longer, more specific terms
    if (word.length > 6) score += 2;
    // Boost compound terms (hyphenated or camelCase)
    if (word.includes('-') || /[A-Z]/.test(word)) score += 2;
    
    wordCount[word] = (wordCount[word] || 0) + score;
  });
  
  // Get top keywords by AI-friendly scoring
  const sortedWords = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([word]) => word);
  
  // Extract potential topic keywords from headings with AI focus
  const headingKeywords = [];
  const headingMatch = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi);
  if (headingMatch) {
    headingMatch.forEach(heading => {
      const headingText = heading.replace(/<[^>]*>/g, '').toLowerCase();
      const headingWords = headingText.split(/\s+/).filter(word => word.length > 3);
      // Boost heading keywords as they're more likely to be AI-relevant
      headingWords.forEach(word => {
        if (!headingKeywords.includes(word)) {
          headingKeywords.push(word);
          // Add to word count with bonus
          wordCount[word] = (wordCount[word] || 0) + 5;
        }
      });
    });
  }
  
  // Extract structured data and schema markup keywords
  const schemaKeywords = [];
  const schemaMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi);
  if (schemaMatch) {
    schemaMatch.forEach(schema => {
      try {
        const schemaData = JSON.parse(schema.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''));
        if (schemaData.name) schemaKeywords.push(schemaData.name.toLowerCase());
        if (schemaData.description) {
          const descWords = schemaData.description.toLowerCase().split(/\s+/).filter(w => w.length > 4);
          schemaKeywords.push(...descWords.slice(0, 5));
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });
  }
  
  // Combine all keyword sources with AI-friendly prioritization
  const allKeywords = [
    ...aiTechnicalTerms,           // AI technical terms (highest priority)
    ...schemaKeywords,             // Schema markup keywords
    ...headingKeywords,            // Heading keywords
    ...sortedWords                 // Content-based keywords
  ];
  
  // Remove duplicates and return top AI-friendly keywords
  const uniqueKeywords = [...new Set(allKeywords)];
  return uniqueKeywords.slice(0, 15); // Return top 15 AI-friendly keywords
};

const generateMetadata = (html, content, title = '', description = '') => {
  console.log('[Metadata Extractor] generateMetadata called with:');
  console.log('[Metadata Extractor] - HTML length:', html ? html.length : 0);
  console.log('[Metadata Extractor] - Content length:', content ? content.length : 0);
  console.log('[Metadata Extractor] - Title:', title);
  console.log('[Metadata Extractor] - Description:', description);
  
  const extractedPublishDate = extractPublishDate(html, content);
  console.log('[Metadata Extractor] Final extracted publish date:', extractedPublishDate);
  
  const metadata = {
    title: title || content.split('\n')[0].substring(0, 60) || 'Untitled Content',
    description: description || content.substring(0, 160) || 'Content description',
    keywords: extractKeywords(html, content),
    author: extractAuthor(html, content),
    publishDate: extractedPublishDate,
    lastModified: extractedPublishDate, // Use same date if no modification date found
    readingTime: Math.ceil(content.split(/\s+/).length / 200),
    wordCount: content.split(/\s+/).length,
    language: 'en'
  };
  
  // Log the final metadata for debugging
  console.log('[Metadata Extractor] Final metadata with dates:', {
    publishDate: metadata.publishDate,
    lastModified: metadata.lastModified,
    hasPublishDate: metadata.publishDate !== null,
    hasLastModified: metadata.lastModified !== null
  });
  
  console.log('[Metadata Extractor] Generated metadata:', metadata);
  return metadata;
};

module.exports = {
  extractAuthor,
  extractKeywords,
  extractPublishDate,
  generateMetadata
}; 