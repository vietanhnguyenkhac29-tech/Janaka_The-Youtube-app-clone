/**
 * YOUTUBE DATA API v3 INTEGRATION
 * Fetches real videos from YouTube
 */

class YouTubeAPI {
  constructor() {
    this.BASE_URL = "http://localhost:5000/api/youtube";
  }

  loadAPIKey() {
    // No longer needed on frontend
  }

  /**
   * Fetch trending/popular videos
   */
  async getTrendingVideos(maxResults = 24, regionCode = "VN") {
    const url = `${this.BASE_URL}/trending?regionCode=${regionCode}&maxResults=${maxResults}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server Error: ${response.status}`);
    }

    const data = await response.json();
    return this.formatVideos(data.items);
  }

  /**
   * Search videos by query
   */
  async searchVideos(query, maxResults = 24) {
    const url = `${this.BASE_URL}/search?q=${encodeURIComponent(
      query
    )}&maxResults=${maxResults}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server Error: ${response.status}`);
    }

    const data = await response.json();
    // The backend /search proxies the full search response
    // But we need video details.
    // The backend searchVideos controller currently returns the search result list.
    // If the backend implementation of searchVideos just calls /search endpoint, it returns snippets.
    // My backend searchVideos does return data.items.
    // BUT the original frontend code fetches details for each ID.
    // Let's rely on the backend to populate details if possible, or just fetch details here.
    // Ideally, the backend should be improved to fetch details.
    // For now, let's keep the client-side chaining but verify backend response structure.

    // Actually, looking at my backend code:
    // exports.searchVideos = ... axios.get(.../search...)
    // It returns whatever YouTube returns.
    // So we still need second step: getVideoDetails.

    const videoIds = (data.items || [])
      .map((item) => item.id?.videoId)
      .filter(Boolean)
      .join(",");
    if (!videoIds) return [];
    return await this.getVideoDetails(videoIds);
  }

  /**
   * Get video details with statistics
   */
  async getVideoDetails(videoIds) {
    const url = `${this.BASE_URL}/details?id=${videoIds}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server Error: ${response.status}`);
    }

    const data = await response.json();
    return this.formatVideos(data.items);
  }

  /**
   * Get videos by category
   */
  async getVideosByCategory(categoryId, maxResults = 24, regionCode = "VN") {
    const url = `${this.BASE_URL}/category?categoryId=${categoryId}&regionCode=${regionCode}&maxResults=${maxResults}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server Error: ${response.status}`);
    }

    const data = await response.json();
    return this.formatVideos(data.items);
  }

  /**
   * Format video data for display
   */
  formatVideos(items) {
    return (items || []).map((item) => ({
      id: item.id?.videoId || item.id,
      title: item.snippet?.title || "Video không có tiêu đề",
      channel: item.snippet?.channelTitle || "Janaka Video",
      thumbnail:
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "",
      thumbnailHigh:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        "",
      publishedAt: this.formatDate(item.snippet?.publishedAt),
      views: this.formatViews(item.statistics?.viewCount),
      duration: this.formatDuration(item.contentDetails?.duration),
      description: item.snippet.description,
    }));
  }

  /**
   * Format view count
   */
  formatViews(count) {
    if (!count) return "0 lượt xem";

    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M lượt xem`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K lượt xem`;
    }
    return `${num} lượt xem`;
  }

  /**
   * Format duration from ISO 8601 (PT1H2M10S)
   */
  formatDuration(duration) {
    if (!duration) return "";

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "";

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  /**
   * Format publish date
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return "Hôm nay";
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
    return `${Math.floor(diffDays / 365)} năm trước`;
  }
}

// YouTube Category IDs
const YOUTUBE_CATEGORIES = {
  "Tất cả": null,
  "Âm nhạc": "10",
  "Trò chơi": "20",
  "Tin tức": "25",
  "Công nghệ": "28",
  "Du lịch": "19",
  "Thể thao": "17",
  "Giáo dục": "27",
  "Phim ảnh": "1",
  "Thời trang": "26",
  "Ẩm thực": "26",
};
