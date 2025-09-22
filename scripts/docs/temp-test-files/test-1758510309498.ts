{
  query: string,                                // Search query - describe what you're looking for
  layer?: 'preference' | 'project' | 'prompt' | 'system', // Filter by specific layer (optional)
  limit?: number,                               // Maximum results (default: 10)
  context?: {                                   // Search context for enhanced relevance
    currentFile?: string,                       // Currently active file path
    selectedCode?: string,                      // Currently selected code
    chatMode?: string,                          // Current chat mode
    includeSemanticSearch?: boolean             // Use semantic TF-IDF search (default: true)
  }
}