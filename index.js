/**
 * GEMINI AI VIDEO PROJECT - FULL FEATURED VERSION
 * All sidebar features working with localStorage persistence
 */

// Storage keys
const STORAGE_KEYS = {
  API_KEY: "gemini_api_key",
  HISTORY: "video_history",
  LIKED: "liked_videos",
  WATCH_LATER: "watch_later_videos",
};
const LOCAL_VIDEO_DB = "janaka-local-videos";
const LOCAL_VIDEO_STORE = "videos";
let selectedLocalVideo = null;

function getStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn(`Invalid stored data for ${key}; resetting it.`, error);
    localStorage.removeItem(key);
    return [];
  }
}

// Initialize YouTube API
const youtubeAPI = new YouTubeAPI();

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  setupDeferredMedia();
  setupSidebar();
  setupNavigation();
  setupSearch();
  setupCategoryFilters();
  setupSettings();
  setupGeminiChat();
  setupVideoActions();
  setupViewHandlers();
  loadCategoryVideos();
  setupWatchPageSupport(); // New
  loadLocalVideos();
  setupLocalVideoActions();
}

function setupDeferredMedia() {
  document.querySelectorAll(".video-card iframe").forEach((iframe) => {
    if (!iframe.hasAttribute("loading")) iframe.setAttribute("loading", "lazy");
  });
}

/**
 * SETUP WATCH PAGE SUPPORT
 */
function setupWatchPageSupport() {
  // Global click interceptor for video cards
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".video-card");
    // Don't intercept if clicking an action button (like/watchlater)
    if (
      card &&
      !card.classList.contains("local-video-card") &&
      !e.target.closest(".video-action-btn") &&
      !e.target.closest("video")
    ) {
      e.preventDefault();
      const media = card.querySelector("iframe, video");
      const title = card.querySelector(".video-title")?.textContent || "";
      const meta = card.querySelector(".video-meta")?.textContent || "";
      const videoId =
        media?.dataset.videoId ||
        media?.src?.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1] ||
        "";

      const videoData = {
        id: videoId,
        title: title,
        meta: meta,
        embedUrl: media?.src || "",
      };

      openWatchPage(videoData);
    }
  });

  // Handle "Show More" in description
  const moreBtn = document.querySelector(".btn-more");
  if (moreBtn) {
    moreBtn.onclick = () => {
      const desc = document.getElementById("watch-description");
      desc.style.webkitLineClamp =
        desc.style.webkitLineClamp === "unset" ? "3" : "unset";
      moreBtn.textContent =
        desc.style.webkitLineClamp === "unset" ? "ẨN BỚT" : "HIỆN THÊM";
    };
  }

  const likeBtn = document.getElementById("watch-like-btn");
  const saveBtn = document.getElementById("watch-save-btn");
  const shareBtn = document.getElementById("watch-share-btn");
  const subscribeBtn = document.querySelector(".btn-subscribe");
  const commentForm = document.getElementById("comment-form");

  likeBtn?.addEventListener("click", () => {
    const video = getCurrentWatchVideo();
    if (!video) return;
    toggleSavedVideo(STORAGE_KEYS.LIKED, video);
    const liked = likeBtn.getAttribute("aria-pressed") !== "true";
    likeBtn.setAttribute("aria-pressed", String(liked));
    likeBtn.querySelector(".material-icons").textContent = liked
      ? "thumb_up_alt"
      : "thumb_up";
  });

  saveBtn?.addEventListener("click", () => {
    const video = getCurrentWatchVideo();
    if (!video) return;
    toggleSavedVideo(STORAGE_KEYS.WATCH_LATER, video);
    const saved = saveBtn.getAttribute("aria-pressed") !== "true";
    saveBtn.setAttribute("aria-pressed", String(saved));
    saveBtn.querySelector(".material-icons").textContent = saved
      ? "playlist_add_check"
      : "playlist_add";
  });

  shareBtn?.addEventListener("click", async () => {
    const shareData = {
      title: document.getElementById("watch-title")?.textContent || "Janaka Video",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        shareBtn.lastChild.textContent = " Đã sao chép";
      }
    } catch (error) {
      if (error.name !== "AbortError") console.error("Unable to share video:", error);
    }
  });

  subscribeBtn?.addEventListener("click", () => {
    const subscribed = subscribeBtn.getAttribute("aria-pressed") !== "true";
    subscribeBtn.setAttribute("aria-pressed", String(subscribed));
    subscribeBtn.textContent = subscribed ? "Đã đăng ký" : "Đăng ký";
  });

  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
    });
  });

  commentForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("comment-input");
    const list = document.getElementById("comments-list");
    const text = input?.value.trim();
    if (!input || !list || !text) return;

    const comment = document.createElement("article");
    comment.className = "comment-item";
    comment.innerHTML = `
      <div class="comment-avatar">B</div>
      <div><strong>Bạn</strong><p>${escapeHtml(text)}</p></div>
    `;
    list.prepend(comment);
    input.value = "";
  });
}

function getCurrentWatchVideo() {
  const iframe = document.getElementById("watch-iframe");
  const title = document.getElementById("watch-title");
  if (!iframe || !title) return null;
  const id = iframe.dataset.videoId || iframe.src.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!id) return null;
  return { id, title: title.textContent, meta: "Janaka Video", embedUrl: iframe.src };
}

/**
 * OPEN WATCH PAGE
 */
async function openWatchPage(videoData) {
  // 1. Hide all views
  document
    .querySelectorAll(".view-section")
    .forEach((v) => (v.style.display = "none"));

  // 2. Show watch view
  const watchView = document.getElementById("view-watch");
  if (watchView) watchView.style.display = "block";

  // 3. Update active sidebar item (Clear all)
  document
    .querySelectorAll(".sidebar-item")
    .forEach((item) => item.classList.remove("active"));

  // 4. Populate main video
  let player = document.getElementById("watch-iframe");
  if (videoData.embedUrl.startsWith("blob:")) {
    if (player?.tagName !== "VIDEO") {
      const videoPlayer = document.createElement("video");
      videoPlayer.id = "watch-iframe";
      videoPlayer.controls = true;
      videoPlayer.autoplay = true;
      videoPlayer.playsInline = true;
      videoPlayer.style.width = "100%";
      videoPlayer.style.aspectRatio = "16/9";
      videoPlayer.style.borderRadius = "12px";
      videoPlayer.style.background = "#000";
      player?.replaceWith(videoPlayer);
      player = videoPlayer;
    }
    player.src = videoData.embedUrl;
    player.load();
    player.play().catch(() => {});
  } else {
    if (player?.tagName !== "IFRAME") {
      const iframe = document.createElement("iframe");
      iframe.id = "watch-iframe";
      iframe.allowFullscreen = true;
      player?.replaceWith(iframe);
      player = iframe;
    }
    player.src = videoData.embedUrl.includes("autoplay=1")
      ? videoData.embedUrl
      : videoData.embedUrl.includes("?")
      ? `${videoData.embedUrl}&autoplay=1`
      : `${videoData.embedUrl}?autoplay=1`;
  }

  document.getElementById("watch-title").textContent = videoData.title;
  document.getElementById("watch-channel-name").textContent = "Janaka Video"; // Fallback
  document.getElementById("watch-likes").textContent =
    Math.floor(Math.random() * 50) + 1 + "N";

  const likedVideos = getStoredArray(STORAGE_KEYS.LIKED);
  const savedVideos = getStoredArray(STORAGE_KEYS.WATCH_LATER);
  const likeBtn = document.getElementById("watch-like-btn");
  const saveBtn = document.getElementById("watch-save-btn");
  const isLiked = likedVideos.some((video) => video.id === videoData.id);
  const isSaved = savedVideos.some((video) => video.id === videoData.id);
  likeBtn?.setAttribute("aria-pressed", String(isLiked));
  saveBtn?.setAttribute("aria-pressed", String(isSaved));
  if (likeBtn) likeBtn.querySelector(".material-icons").textContent = isLiked ? "thumb_up_alt" : "thumb_up";
  if (saveBtn) saveBtn.querySelector(".material-icons").textContent = isSaved ? "playlist_add_check" : "playlist_add";

  // 5. Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });

  // 6. Add to history
  addToHistory(videoData);

  // 7. Load recommendations
  loadWatchRecommendations(videoData.title);
}

/**
 * LOAD WATCH RECOMMENDATIONS (Sidebar)
 */
async function loadWatchRecommendations(query) {
  const container = document.getElementById("watch-recommendations");
  if (!container) return;

  const currentId = getCurrentWatchVideo()?.id;
  container.innerHTML =
    '<div class="recommendation-loading"><span></span><span></span><span></span><p>Đang tải video liên quan...</p></div>';

  try {
    let videos = [];
    try {
      videos = await youtubeAPI.searchVideos(query, 10);
    } catch (error) {
      console.warn("YouTube recommendations unavailable; using local videos.", error);
    }

    videos = videos
      .filter((video) => video?.id && video.id !== currentId)
      .slice(0, 10);

    if (videos.length === 0) {
      videos = getLocalRecommendations(currentId);
    }

    if (videos.length === 0) {
      container.innerHTML = "<p>Không tìm thấy video liên quan.</p>";
      return;
    }

    container.innerHTML = videos
      .map(
        (video) => `
        <a href="#" class="horizontal-video-card" data-video="${encodeURIComponent(JSON.stringify({
        id: video.id,
        title: video.title,
          meta: `${video.channel || "Janaka Video"} • ${video.views || "Video"}`,
        embedUrl: `https://www.youtube.com/embed/${video.id}`,
        }))}">
        <div class="thumbnail-side">
            <img loading="lazy" src="${video.thumbnail}" alt="${escapeHtml(video.title)}">
        </div>
        <div class="info-side">
          <h4 class="video-title">${escapeHtml(video.title)}</h4>
            <p class="video-meta">${escapeHtml(video.channel || "Janaka Video")}</p>
            <p class="video-meta">${escapeHtml(video.views || "Video liên quan")}</p>
        </div>
      </a>
    `
      )
      .join("");

    // Add click listeners to horizontal cards
    container.querySelectorAll(".horizontal-video-card").forEach((link) => {
      link.onclick = (e) => {
        e.preventDefault();
        const data = JSON.parse(decodeURIComponent(link.dataset.video));
        openWatchPage(data);
      };
    });
  } catch (error) {
    console.error("Failed to load recommendations:", error);
    container.innerHTML = "<p>Chưa có video liên quan để hiển thị.</p>";
  }
}

function getLocalRecommendations(currentId) {
  return [...document.querySelectorAll(".video-card")]
    .map((card) => {
      const iframe = card.querySelector("iframe");
      const title = card.querySelector(".video-title")?.textContent.trim();
      const id = iframe?.src.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1];
      if (!id || !title || id === currentId) return null;
      return {
        id,
        title,
        channel: "Janaka Video",
        views: card.querySelector(".video-meta")?.textContent.trim() || "Video liên quan",
        thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      };
    })
    .filter(Boolean)
    .slice(0, 10);
}

/**
 * SIDEBAR TOGGLE
 */
function setupSidebar() {
  const toggleBtn = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      const isActive = sidebar.classList.toggle("active");
      toggleBtn.setAttribute("aria-expanded", isActive);
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (
          !sidebar.contains(e.target) &&
          !toggleBtn.contains(e.target) &&
          sidebar.classList.contains("active")
        ) {
          sidebar.classList.remove("active");
        }
      }
    });
  }
}

/**
 * NAVIGATION (SPA Behavior)
 */
function setupNavigation() {
  const links = document.querySelectorAll(".sidebar-item[data-view]");
  const views = document.querySelectorAll(".view-section");

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const viewId = link.getAttribute("data-view");

      views.forEach((view) => (view.style.display = "none"));

      const targetView = document.getElementById(`view-${viewId}`);
      if (targetView) {
        targetView.style.display = "block";
        // Trigger view-specific loading
        onViewChange(viewId);
      }

      document
        .querySelectorAll(".sidebar-item")
        .forEach((item) => item.classList.remove("active"));
      link.classList.add("active");

      if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("active");
      }
    });
  });
}

/**
 * VIEW CHANGE HANDLER
 */
function onViewChange(viewId) {
  switch (viewId) {
    case "history":
      renderSavedVideos("history-content", STORAGE_KEYS.HISTORY);
      break;
    case "liked":
      renderSavedVideos("liked-content", STORAGE_KEYS.LIKED);
      break;
    case "watchlater":
      renderSavedVideos("watchlater-content", STORAGE_KEYS.WATCH_LATER);
      break;
    case "library":
      updateLibraryStats();
      break;
    case "explore":
    case "music":
    case "gaming":
      loadCategoryVideos(viewId);
      break;
    case "my-videos":
      loadMyVideos();
      break;
  }
}

/**
 * SETUP VIEW HANDLERS (buttons, etc.)
 */
function setupViewHandlers() {
  // Clear history button
  const clearHistoryBtn = document.getElementById("clear-history");
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
      if (confirm("Bạn có chắc muốn xóa lịch sử xem?")) {
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
        renderSavedVideos("history-content", STORAGE_KEYS.HISTORY);
        alert("✅ Đã xóa lịch sử!");
      }
    });
  }

  // Clear all data button
  const clearAllBtn = document.getElementById("clear-all-data");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      if (
        confirm(
          "⚠️ Bạn có chắc muốn xóa TẤT CẢ dữ liệu? Hành động này không thể hoàn tác!"
        )
      ) {
        Object.values(STORAGE_KEYS).forEach((key) =>
          localStorage.removeItem(key)
        );
        alert("✅ Đã xóa tất cả dữ liệu!");
        location.reload();
      }
    });
  }

  // Send feedback button
  const sendFeedbackBtn = document.getElementById("send-feedback");
  if (sendFeedbackBtn) {
    sendFeedbackBtn.addEventListener("click", () => {
      const textarea = document.getElementById("feedback-text");
      if (textarea && textarea.value.trim()) {
        alert("✅ Cảm ơn bạn đã gửi phản hồi!");
        textarea.value = "";
      } else {
        alert("⚠️ Vui lòng nhập nội dung phản hồi.");
      }
    });
  }
}

/**
 * SETUP VIDEO ACTIONS (Like, Watch Later)
 */
function setupVideoActions() {
  // Add action buttons to each video card
  const videoCards = document.querySelectorAll(".video-card");

  videoCards.forEach((card, index) => {
    const videoInfo = card.querySelector(".video-info");
    if (!videoInfo || videoInfo.querySelector(".video-actions")) return;

    // Extract video data
    const iframe = card.querySelector("iframe");
    const title = card.querySelector(".video-title")?.textContent || "";
    const meta = card.querySelector(".video-meta")?.textContent || "";
    const videoId =
      iframe?.src?.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1] || `video-${index}`;

    const videoData = {
      id: videoId,
      title: title,
      meta: meta,
      embedUrl: iframe?.src || "",
    };

    // Create action buttons
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "video-actions";
    const encodedVideoData = encodeURIComponent(JSON.stringify(videoData));
    actionsDiv.innerHTML = `
      <button class="video-action-btn like-btn" data-video="${encodedVideoData}" title="Thích">
        <span class="material-icons">favorite_border</span>
      </button>
      <button class="video-action-btn watchlater-btn" data-video="${encodedVideoData}" title="Xem sau">
        <span class="material-icons">watch_later</span>
      </button>
    `;

    videoInfo.appendChild(actionsDiv);

    // Update button states
    updateActionButtonStates(actionsDiv, videoId);
  });

  // Event delegation for action buttons
  document.addEventListener("click", (e) => {
    const likeBtn = e.target.closest(".like-btn");
    const watchLaterBtn = e.target.closest(".watchlater-btn");

    if (likeBtn) {
      const videoData = JSON.parse(decodeURIComponent(likeBtn.dataset.video));
      toggleSavedVideo(STORAGE_KEYS.LIKED, videoData);
      updateActionButtonStates(likeBtn.parentElement, videoData.id);
    }

    if (watchLaterBtn) {
      const videoData = JSON.parse(
        decodeURIComponent(watchLaterBtn.dataset.video)
      );
      toggleSavedVideo(STORAGE_KEYS.WATCH_LATER, videoData);
      updateActionButtonStates(watchLaterBtn.parentElement, videoData.id);
    }
  });

  // Track video plays to history
  document.querySelectorAll(".video-card iframe").forEach((iframe, index) => {
    iframe.addEventListener("load", () => {
      const card = iframe.closest(".video-card");
      if (!card) return;

      const title = card.querySelector(".video-title")?.textContent || "";
      const meta = card.querySelector(".video-meta")?.textContent || "";
      const videoId =
        iframe.src?.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1] || `video-${index}`;

      const videoData = {
        id: videoId,
        title: title,
        meta: meta,
        embedUrl: iframe.src,
        watchedAt: new Date().toISOString(),
      };

      addToHistory(videoData);
    });
  });
}

/**
 * TOGGLE SAVED VIDEO
 */
function toggleSavedVideo(storageKey, videoData) {
  const saved = getStoredArray(storageKey);
  const index = saved.findIndex((v) => v.id === videoData.id);

  if (index > -1) {
    saved.splice(index, 1);
  } else {
    saved.unshift(videoData);
  }

  localStorage.setItem(storageKey, JSON.stringify(saved));
}

/**
 * ADD TO HISTORY
 */
function addToHistory(videoData) {
  const history = getStoredArray(STORAGE_KEYS.HISTORY);

  // Remove if already exists
  const index = history.findIndex((v) => v.id === videoData.id);
  if (index > -1) {
    history.splice(index, 1);
  }

  // Add to beginning
  history.unshift(videoData);

  // Keep only last 50
  if (history.length > 50) {
    history.pop();
  }

  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

/**
 * UPDATE ACTION BUTTON STATES
 */
function updateActionButtonStates(container, videoId) {
  const likedVideos = getStoredArray(STORAGE_KEYS.LIKED);
  const watchLaterVideos = getStoredArray(STORAGE_KEYS.WATCH_LATER);

  const likeBtn = container.querySelector(".like-btn");
  const watchLaterBtn = container.querySelector(".watchlater-btn");

  if (likeBtn) {
    const isLiked = likedVideos.some((v) => v.id === videoId);
    likeBtn.classList.toggle("active", isLiked);
    likeBtn.querySelector(".material-icons").textContent = isLiked
      ? "favorite"
      : "favorite_border";
  }

  if (watchLaterBtn) {
    const isWatchLater = watchLaterVideos.some((v) => v.id === videoId);
    watchLaterBtn.classList.toggle("active", isWatchLater);
  }
}

/**
 * RENDER SAVED VIDEOS
 */
function renderSavedVideos(containerId, storageKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const videos = getStoredArray(storageKey);

  if (videos.length === 0) {
    const emptyMessages = {
      [STORAGE_KEYS.HISTORY]: "📺 Chưa có video nào trong lịch sử xem.",
      [STORAGE_KEYS.LIKED]: "❤️ Chưa có video nào được thích.",
      [STORAGE_KEYS.WATCH_LATER]:
        "⏰ Chưa có video nào trong danh sách xem sau.",
    };
    container.innerHTML = `<p class="empty-state">${
      emptyMessages[storageKey] || "Không có video."
    }</p>`;
    return;
  }

  container.innerHTML = videos
    .map(
      (video) => `
    <article class="video-card">
      <div class="video-thumbnail">
        <iframe src="${escapeHtml(video.embedUrl)}" title="${escapeHtml(
        video.title
      )}" allowfullscreen></iframe>
      </div>
      <div class="video-info">
        <h3 class="video-title">${escapeHtml(video.title)}</h3>
        <p class="video-meta">${escapeHtml(video.meta)}</p>
        <button class="btn-secondary remove-saved-btn" data-storage="${storageKey}" data-id="${
        video.id
      }">
          Xóa
        </button>
      </div>
    </article>
  `
    )
    .join("");

  // Remove button handlers
  container.querySelectorAll(".remove-saved-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.storage;
      const id = btn.dataset.id;
      const saved = getStoredArray(key);
      const filtered = saved.filter((v) => v.id !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
      renderSavedVideos(containerId, storageKey);
    });
  });
}

/**
 * UPDATE LIBRARY STATS & ANALYTICS
 * Now replaced with 3D book library - this function is kept for compatibility
 */
function updateLibraryStats() {
  // Library now shows 3D educational books instead of analytics
  // Initialize book interactions if not already done
  initializeBookLibrary();
}

/**
 * INITIALIZE 3D BOOK LIBRARY
 */
function initializeBookLibrary() {
  const books = document.querySelectorAll('.book');
  const bookModal = document.getElementById('book-modal');
  const closeModal = document.querySelector('.close-modal');

  if (!books.length || !bookModal) return;

  // Add click event to each book
  books.forEach(book => {
    book.addEventListener('click', () => {
      const language = book.getAttribute('data-language');
      showBookContent(language);
    });
  });

  // Close modal events
  if (closeModal) {
    closeModal.addEventListener('click', closeBookModal);
  }

  // Close modal when clicking outside
  bookModal.addEventListener('click', (e) => {
    if (e.target === bookModal) {
      closeBookModal();
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookModal.style.display === 'flex') {
      closeBookModal();
    }
  });
}

/**
 * SHOW BOOK CONTENT IN MODAL
 */
function showBookContent(language) {
  const bookModal = document.getElementById('book-modal');
  const bookContent = document.getElementById('book-content');

  if (!bookModal || !bookContent) return;

  let content = '';

  switch (language) {
    case 'c':
      content = `
        <h2>Ngôn ngữ lập trình C</h2>
        <p><strong>C</strong> là ngôn ngữ lập trình hệ thống mạnh mẽ, được phát triển bởi Dennis Ritchie vào năm 1972. Nó là nền tảng cho nhiều ngôn ngữ hiện đại.</p>

        <h3>Các khái niệm cơ bản:</h3>
        <ul>
          <li><strong>Biến và kiểu dữ liệu:</strong> int, float, char, double</li>
          <li><strong>Cấu trúc điều khiển:</strong> if-else, for, while, switch</li>
          <li><strong>Hàm:</strong> Khai báo và định nghĩa hàm</li>
          <li><strong>Con trỏ:</strong> Khái niệm quan trọng trong C</li>
        </ul>

        <h3>Ví dụ cơ bản:</h3>
        <pre><code>#include &lt;stdio.h&gt;

int main() {
    printf("Hello, World!\\n");
    return 0;
}</code></pre>

        <h3>Ứng dụng:</h3>
        <ul>
          <li>Phát triển hệ điều hành (Linux, Windows)</li>
          <li>Lập trình nhúng</li>
          <li>Game development</li>
          <li>Hệ thống thời gian thực</li>
        </ul>
      `;
      break;

    case 'python':
      content = `
        <h2>Python</h2>
        <p><strong>Python</strong> là ngôn ngữ lập trình bậc cao, dễ học và có cú pháp rõ ràng. Được tạo bởi Guido van Rossum vào năm 1991.</p>

        <h3>Đặc điểm nổi bật:</h3>
        <ul>
          <li>Cú pháp đơn giản, dễ đọc</li>
          <li>Thư viện phong phú</li>
          <li>Hỗ trợ nhiều paradigm: OOP, functional, procedural</li>
          <li>Cross-platform</li>
        </ul>

        <h3>Ví dụ cơ bản:</h3>
        <pre><code>print("Hello, World!")

# Variables and data types
name = "Python"
age = 30
is_programming_language = True

# Lists
languages = ["Python", "Java", "C++", "JavaScript"]

# Functions
def greet(name):
    return f"Hello, {name}!"

print(greet("Coder"))</code></pre>

        <h3>Lĩnh vực ứng dụng:</h3>
        <ul>
          <li>Data Science và Machine Learning</li>
          <li>Web Development (Django, Flask)</li>
          <li>Automation scripts</li>
          <li>Game Development (Pygame)</li>
          <li>Scientific Computing</li>
        </ul>
      `;
      break;

    case 'javascript':
      content = `
        <h2>JavaScript</h2>
        <p><strong>JavaScript</strong> là ngôn ngữ lập trình kịch bản, chủ yếu được sử dụng để phát triển web. Ban đầu được tạo bởi Brendan Eich tại Netscape.</p>

        <h3>Các khái niệm chính:</h3>
        <ul>
          <li><strong>Biến:</strong> var, let, const</li>
          <li><strong>Functions:</strong> Function declarations, arrow functions</li>
          <li><strong>Objects & Arrays:</strong> JSON, array methods</li>
          <li><strong>DOM Manipulation:</strong> Thao tác với HTML elements</li>
          <li><strong>Asynchronous:</strong> Promises, async/await</li>
        </ul>

        <h3>Ví dụ:</h3>
        <pre><code>// Variables
let message = "Hello, JavaScript!";
const PI = 3.14159;

// Arrow function
const greet = (name) => \`Hello, \${name}!\`;

// Object
const user = {
  name: "John",
  age: 30,
  isDeveloper: true
};

// DOM manipulation
document.getElementById('demo').innerHTML = greet(user.name);</code></pre>

        <h3>Frameworks & Libraries:</h3>
        <ul>
          <li><strong>React:</strong> UI library</li>
          <li><strong>Vue.js:</strong> Progressive framework</li>
          <li><strong>Node.js:</strong> Server-side JavaScript</li>
          <li><strong>Express:</strong> Web application framework</li>
        </ul>
      `;
      break;

    case 'html':
      content = `
        <h2>HTML5</h2>
        <p><strong>HTML (HyperText Markup Language)</strong> là ngôn ngữ đánh dấu tiêu chuẩn để tạo cấu trúc trang web.</p>

        <h3>Cấu trúc cơ bản:</h3>
        <pre><code>&lt;!DOCTYPE html&gt;
&lt;html lang="vi"&gt;
&lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;title&gt;Tiêu đề trang&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;h1&gt;Chào mừng&lt;/h1&gt;
    &lt;p&gt;Đây là nội dung trang web.&lt;/p&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>

        <h3>Thẻ HTML quan trọng:</h3>
        <ul>
          <li><code>&lt;div&gt;</code> - Container element</li>
          <li><code>&lt;p&gt;</code> - Paragraph</li>
          <li><code>&lt;a&gt;</code> - Link</li>
          <li><code>&lt;img&gt;</code> - Image</li>
          <li><code>&lt;form&gt;</code> - Form</li>
          <li><code>&lt;input&gt;</code> - Input field</li>
        </ul>

        <h3>Tính năng HTML5 mới:</h3>
        <ul>
          <li>Semantic elements: &lt;header&gt;, &lt;nav&gt;, &lt;section&gt;, &lt;article&gt;</li>
          <li>Multimedia: &lt;video&gt;, &lt;audio&gt;</li>
          <li>Canvas for graphics</li>
          <li>Local storage</li>
          <li>Geolocation API</li>
        </ul>
      `;
      break;

    case 'css':
      content = `
        <h2>CSS3</h2>
        <p><strong>CSS (Cascading Style Sheets)</strong> được sử dụng để mô tả cách trình bày tài liệu HTML.</p>

        <h3>Các khái niệm cơ bản:</h3>
        <ul>
          <li><strong>Selectors:</strong> Element, class, id selectors</li>
          <li><strong>Box Model:</strong> margin, border, padding, content</li>
          <li><strong>Layout:</strong> Flexbox, Grid, Positioning</li>
          <li><strong>Responsive Design:</strong> Media queries</li>
        </ul>

        <h3>Ví dụ CSS:</h3>
        <pre><code>/* Element selector */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}

/* Class selector */
.container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 20px;
}

/* ID selector */
#header {
  background-color: #333;
  color: white;
  padding: 1rem;
}

/* Flexbox layout */
.flex-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}</code></pre>

        <h3>Tính năng CSS3:</h3>
        <ul>
          <li>Animations và Transitions</li>
          <li>Transform (rotate, scale, translate)</li>
          <li>Gradients</li>
          <li>Box-shadow và Text-shadow</li>
          <li>Border-radius</li>
        </ul>
      `;
      break;

    case 'react':
      content = `
        <h2>React</h2>
        <p><strong>React</strong> là thư viện JavaScript để xây dựng giao diện người dùng, được phát triển bởi Facebook.</p>

        <h3>Khái niệm cốt lõi:</h3>
        <ul>
          <li><strong>Components:</strong> Function và Class components</li>
          <li><strong>JSX:</strong> Cú pháp mở rộng JavaScript</li>
          <li><strong>State:</strong> Quản lý trạng thái component</li>
          <li><strong>Props:</strong> Truyền dữ liệu giữa components</li>
          <li><strong>Hooks:</strong> useState, useEffect, useContext</li>
        </ul>

        <h3>Ví dụ cơ bản:</h3>
        <pre><code>import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    &lt;div&gt;
      &lt;h1&gt;Count: {count}&lt;/h1&gt;
      &lt;button onClick={() =&gt; setCount(count + 1)}&gt;
        Tăng
      &lt;/button&gt;
    &lt;/div&gt;
  );
}

export default Counter;</code></pre>

        <h3>Lifecycle và Hooks:</h3>
        <ul>
          <li><strong>useState:</strong> Quản lý state</li>
          <li><strong>useEffect:</strong> Side effects</li>
          <li><strong>useContext:</strong> Context API</li>
          <li><strong>useReducer:</strong> Complex state logic</li>
        </ul>
      `;
      break;

    case 'node':
      content = `
        <h2>Node.js</h2>
        <p><strong>Node.js</strong> là runtime JavaScript được xây dựng trên Chrome's V8 JavaScript engine, cho phép chạy JavaScript ở phía server.</p>

        <h3>Đặc điểm chính:</h3>
        <ul>
          <li>Non-blocking I/O</li>
          <li>Event-driven architecture</li>
          <li>NPM (Node Package Manager)</li>
          <li>Single-threaded nhưng scalable</li>
        </ul>

        <h3>Ví dụ cơ bản:</h3>
        <pre><code>const http = require('http');

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\\n');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});</code></pre>

        <h3>Frameworks phổ biến:</h3>
        <ul>
          <li><strong>Express.js:</strong> Web application framework</li>
          <li><strong>Koa.js:</strong> Next-generation web framework</li>
          <li><strong>NestJS:</strong> Progressive Node.js framework</li>
          <li><strong>Fastify:</strong> Fast and low overhead web framework</li>
        </ul>

        <h3>Ứng dụng:</h3>
        <ul>
          <li>RESTful APIs</li>
          <li>Real-time applications (Socket.io)</li>
          <li>Microservices</li>
          <li>CLI tools</li>
          <li>Server-side rendering</li>
        </ul>
      `;
      break;

    case 'algorithms':
      content = `
        <h2>Thuật toán</h2>
        <p><strong>Thuật toán</strong> là tập hợp các bước có hệ thống để giải quyết vấn đề hoặc thực hiện nhiệm vụ.</p>

        <h3>Các loại thuật toán cơ bản:</h3>
        <ul>
          <li><strong>Sorting:</strong> Bubble sort, Quick sort, Merge sort</li>
          <li><strong>Searching:</strong> Linear search, Binary search</li>
          <li><strong>Graph algorithms:</strong> DFS, BFS, Dijkstra</li>
          <li><strong>Dynamic Programming:</strong> Fibonacci, Knapsack</li>
        </ul>

        <h3>Ví dụ Binary Search:</h3>
        <pre><code>function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1; // Not found
}</code></pre>

        <h3>Đánh giá thuật toán:</h3>
        <ul>
          <li><strong>Time Complexity:</strong> O(1), O(log n), O(n), O(n²)</li>
          <li><strong>Space Complexity:</strong> Bộ nhớ sử dụng</li>
          <li><strong>Big O Notation:</strong> Đánh giá hiệu suất</li>
        </ul>
      `;
      break;

    case 'database':
      content = `
        <h2>Cơ sở dữ liệu</h2>
        <p><strong>Cơ sở dữ liệu</strong> là tập hợp có tổ chức các dữ liệu được lưu trữ và truy cập điện tử.</p>

        <h3>Các loại cơ sở dữ liệu:</h3>
        <ul>
          <li><strong>SQL Databases:</strong> MySQL, PostgreSQL, SQLite</li>
          <li><strong>NoSQL Databases:</strong> MongoDB, Redis, Cassandra</li>
          <li><strong>Graph Databases:</strong> Neo4j</li>
          <li><strong>Time Series:</strong> InfluxDB</li>
        </ul>

        <h3>SQL Cơ bản:</h3>
        <pre><code>-- Tạo bảng
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chèn dữ liệu
INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com');

-- Truy vấn dữ liệu
SELECT * FROM users WHERE name LIKE 'John%';

-- Cập nhật dữ liệu
UPDATE users SET email = 'john.doe@example.com' WHERE id = 1;

-- Xóa dữ liệu
DELETE FROM users WHERE id = 1;</code></pre>

        <h3>MongoDB (NoSQL):</h3>
        <pre><code>// Kết nối MongoDB
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/mydb');

// Định nghĩa Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Tạo document mới
const user = new User({
  name: 'John Doe',
  email: 'john@example.com'
});

user.save();</code></pre>
      `;
      break;

    case 'security':
      content = `
        <h2>An ninh mạng</h2>
        <p><strong>An ninh mạng</strong> là thực hành bảo vệ hệ thống, mạng và dữ liệu khỏi các cuộc tấn công kỹ thuật số.</p>

        <h3>Các mối đe dọa phổ biến:</h3>
        <ul>
          <li><strong>Malware:</strong> Virus, trojan, ransomware</li>
          <li><strong>Phishing:</strong> Lừa đảo qua email</li>
          <li><strong>SQL Injection:</strong> Tấn công cơ sở dữ liệu</li>
          <li><strong>XSS:</strong> Cross-Site Scripting</li>
          <li><strong>CSRF:</strong> Cross-Site Request Forgery</li>
        </ul>

        <h3>Các biện pháp bảo mật:</h3>
        <ul>
          <li><strong>Authentication:</strong> JWT, OAuth, Multi-factor</li>
          <li><strong>Encryption:</strong> HTTPS, SSL/TLS</li>
          <li><strong>Input Validation:</strong> Sanitize user input</li>
          <li><strong>Password Hashing:</strong> bcrypt, Argon2</li>
          <li><strong>CORS:</strong> Cross-Origin Resource Sharing</li>
        </ul>

        <h3>Ví dụ bảo mật API:</h3>
        <pre><code>// JWT Authentication middleware
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Sử dụng middleware
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is protected data' });
});</code></pre>
      `;
      break;

    case 'ai':
      content = `
        <h2>Trí tuệ nhân tạo</h2>
        <p><strong>AI (Artificial Intelligence)</strong> là khả năng của máy móc thực hiện các nhiệm vụ thường yêu cầu trí tuệ con người.</p>

        <h3>Các lĩnh vực AI:</h3>
        <ul>
          <li><strong>Machine Learning:</strong> Học máy</li>
          <li><strong>Deep Learning:</strong> Học sâu</li>
          <li><strong>Natural Language Processing:</strong> Xử lý ngôn ngữ tự nhiên</li>
          <li><strong>Computer Vision:</strong> Thị giác máy tính</li>
          <li><strong>Robotics:</strong> Robot</li>
        </ul>

        <h3>Machine Learning cơ bản:</h3>
        <pre><code>import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression

# Dữ liệu mẫu
X = np.array([[1], [2], [3], [4], [5]])
y = np.array([2, 4, 6, 8, 10])

# Chia dữ liệu
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Tạo và train model
model = LinearRegression()
model.fit(X_train, y_train)

# Dự đoán
predictions = model.predict(X_test)
print("Predictions:", predictions)</code></pre>

        <h3>Các thư viện AI phổ biến:</h3>
        <ul>
          <li><strong>TensorFlow:</strong> Framework ML của Google</li>
          <li><strong>PyTorch:</strong> Framework ML của Facebook</li>
          <li><strong>scikit-learn:</strong> Thư viện ML cho Python</li>
          <li><strong>Keras:</strong> API neural networks</li>
          <li><strong>OpenCV:</strong> Computer vision</li>
        </ul>

        <h3>Ứng dụng AI:</h3>
        <ul>
          <li>Chatbots và Virtual Assistants</li>
          <li>Recommendation Systems</li>
          <li>Image Recognition</li>
          <li>Autonomous Vehicles</li>
          <li>Medical Diagnosis</li>
          <li>Fraud Detection</li>
        </ul>
      `;
      break;

    default:
      content = `
        <h2>Thông tin đang được cập nhật</h2>
        <p>Nội dung cho chủ đề này đang được phát triển. Vui lòng quay lại sau!</p>
      `;
  }

  bookContent.innerHTML = content;
  bookModal.style.display = 'flex';
}

/**
 * CLOSE BOOK MODAL
 */
function closeBookModal() {
  const bookModal = document.getElementById('book-modal');
  if (bookModal) {
    bookModal.style.display = 'none';
  }
}

/**
 * ANALYZE USER INTERESTS
 */
function analyzeInterests(history, liked) {
  const interestsContainer = document.getElementById("interests-chart");
  const categoriesContainer = document.getElementById("top-categories");

  if (!interestsContainer || !categoriesContainer) return;

  // Combine all user data for analysis
  const allVideos = [...liked, ...history];

  if (allVideos.length === 0) {
    interestsContainer.innerHTML =
      '<p class="empty-state">📊 Xem và thích video để phân tích sở thích!</p>';
    categoriesContainer.innerHTML =
      '<p class="empty-state">🏷️ Chưa có dữ liệu danh mục.</p>';
    return;
  }

  // Category detection keywords
  const categoryPatterns = {
    "Công nghệ": [
      "javascript",
      "html",
      "css",
      "programming",
      "react",
      "git",
      "docker",
      "php",
      "sql",
      "llm",
      "machine learning",
      "devops",
      "cloud",
      "framework",
      "sass",
      "ui/ux",
      "figma",
      "lập trình",
      "code",
      "web",
    ],
    "Giáo dục": [
      "khóa học",
      "hướng dẫn",
      "tutorial",
      "course",
      "học",
      "cấu trúc",
      "giải thuật",
      "lộ trình",
    ],
    "Âm nhạc": ["music", "nhạc", "song", "melody", "audio"],
    "Trò chơi": ["game", "gaming", "esports", "trò chơi"],
    Khác: [],
  };

  // Count category occurrences
  const categoryCounts = {};
  Object.keys(categoryPatterns).forEach((cat) => (categoryCounts[cat] = 0));

  allVideos.forEach((video) => {
    const content = (video.title + " " + video.meta).toLowerCase();

    let matched = false;
    for (const [category, keywords] of Object.entries(categoryPatterns)) {
      if (category === "Khác") continue;

      for (const keyword of keywords) {
        if (content.includes(keyword.toLowerCase())) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      categoryCounts["Khác"] = (categoryCounts["Khác"] || 0) + 1;
    }
  });

  // Sort by count
  const sortedCategories = Object.entries(categoryCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalCount = sortedCategories.reduce(
    (sum, [_, count]) => sum + count,
    0
  );

  // Render interests chart
  const categoryColors = {
    "Công nghệ": "tech",
    "Giáo dục": "education",
    "Âm nhạc": "music",
    "Trò chơi": "gaming",
    Khác: "other",
  };

  if (sortedCategories.length > 0) {
    interestsContainer.innerHTML = sortedCategories
      .map(([category, count]) => {
        const percentage = Math.round((count / totalCount) * 100);
        const colorClass = categoryColors[category] || "other";
        return `
        <div class="interest-bar">
          <span class="interest-label">${category}</span>
          <div class="interest-bar-container">
            <div class="interest-bar-fill ${colorClass}" style="width: ${percentage}%">
              ${percentage}%
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Render top categories tags
    categoriesContainer.innerHTML = sortedCategories
      .slice(0, 5)
      .map(([category, count], index) => {
        const topClass = index < 3 ? `top-${index + 1}` : "";
        return `
        <span class="category-tag ${topClass}">
          ${category}
          <span class="count">${count}</span>
        </span>
      `;
      })
      .join("");
  }
}

/**
 * GENERATE PERSONALIZED RECOMMENDATIONS
 */
function generateRecommendations(history, liked) {
  const container = document.getElementById("recommendations-library");
  if (!container) return;

  const allUserVideos = [...liked, ...history];

  if (allUserVideos.length === 0) {
    container.innerHTML =
      '<p class="empty-state">🎯 Xem thêm video để nhận đề xuất cá nhân hóa!</p>';
    return;
  }

  // Extract keywords from user's watched/liked videos
  const userKeywords = new Set();
  allUserVideos.forEach((video) => {
    const words = (video.title + " " + video.meta).toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.length > 3) userKeywords.add(word);
    });
  });

  // Get all videos from home
  const allVideos = document.querySelectorAll("#view-home .video-card");
  const watchedIds = new Set(allUserVideos.map((v) => v.id));

  // Score each video based on keyword match
  const scoredVideos = [];

  allVideos.forEach((card) => {
    const iframe = card.querySelector("iframe");
    const videoId = iframe?.src?.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1];

    // Skip already watched/liked
    if (watchedIds.has(videoId)) return;

    const title = card.querySelector(".video-title")?.textContent || "";
    const meta = card.querySelector(".video-meta")?.textContent || "";
    const content = (title + " " + meta).toLowerCase();

    // Calculate relevance score
    let score = 0;
    userKeywords.forEach((keyword) => {
      if (content.includes(keyword)) score++;
    });

    if (score > 0) {
      scoredVideos.push({
        card: card,
        score: score,
        title: title,
        meta: meta,
        embedUrl: iframe?.src || "",
      });
    }
  });

  // Sort by score and take top 6
  scoredVideos.sort((a, b) => b.score - a.score);
  const topRecommendations = scoredVideos.slice(0, 6);

  if (topRecommendations.length === 0) {
    container.innerHTML =
      '<p class="empty-state">🎯 Xem thêm video để nhận đề xuất phù hợp hơn!</p>';
    return;
  }

  // Render recommendations
  container.innerHTML = topRecommendations
    .map(
      (rec, index) => `
    <article class="video-card">
      <div class="video-thumbnail">
        <span class="recommendation-badge">Đề xuất #${index + 1}</span>
        <iframe src="${rec.embedUrl}" title="${escapeHtml(
        rec.title
      )}" allowfullscreen></iframe>
      </div>
      <div class="video-info">
        <h3 class="video-title">${escapeHtml(rec.title)}</h3>
        <p class="video-meta">${escapeHtml(rec.meta)}</p>
      </div>
    </article>
  `
    )
    .join("");
}

/**
 * HANDLE "ĐỀ XUẤT" CATEGORY FILTER
 */
function handleRecommendationCategory() {
  const history = getStoredArray(STORAGE_KEYS.HISTORY);
  const liked = getStoredArray(STORAGE_KEYS.LIKED);

  const allUserVideos = [...liked, ...history];
  const videos = document.querySelectorAll("#view-home .video-card");

  if (allUserVideos.length === 0) {
    // Show all if no data
    videos.forEach((v) => (v.style.display = "flex"));
    return;
  }

  // Extract keywords
  const userKeywords = new Set();
  allUserVideos.forEach((video) => {
    const words = (video.title + " " + video.meta).toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.length > 3) userKeywords.add(word);
    });
  });

  const watchedIds = new Set(allUserVideos.map((v) => v.id));

  videos.forEach((card) => {
    const iframe = card.querySelector("iframe");
    const videoId = iframe?.src?.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1];

    if (watchedIds.has(videoId)) {
      card.style.display = "none";
      return;
    }

    const title = card.querySelector(".video-title")?.textContent || "";
    const meta = card.querySelector(".video-meta")?.textContent || "";
    const content = `${title} ${meta}`.toLowerCase();
    let matches = false;
    userKeywords.forEach((keyword) => {
      if (content.includes(keyword)) matches = true;
    });

    card.style.display = matches ? "flex" : "none";
  });
}

/**
 * HANDLE "ĐÃ XEM" CATEGORY FILTER
 */
function handleWatchedCategory(videos) {
  const history = getStoredArray(STORAGE_KEYS.HISTORY);
  const watchedIds = new Set(history.map((v) => v.id));

  if (watchedIds.size === 0) {
    videos.forEach((v) => (v.style.display = "none"));
    return;
  }

  videos.forEach((card) => {
    const iframe = card.querySelector("iframe");
    const videoId = iframe?.src?.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1];

    if (watchedIds.has(videoId)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

/**
 * LOAD CATEGORY VIDEOS (Explore, Music, Gaming)
 */
function loadCategoryVideos(viewId) {
  const homeVideos = document.querySelectorAll("#view-home .video-card");
  let targetContainer = null;
  let keywords = [];

  switch (viewId) {
    case "explore":
      targetContainer = document.getElementById("explore-content");
      // Show all videos for explore
      break;
    case "music":
      targetContainer = document.getElementById("music-content");
      keywords = ["music", "nhạc", "song", "melody"];
      break;
    case "gaming":
      targetContainer = document.getElementById("gaming-content");
      keywords = ["game", "trò chơi", "gaming", "esports"];
      break;
  }

  if (!targetContainer || targetContainer.children.length > 0) return;

  homeVideos.forEach((card) => {
    const title =
      card.querySelector(".video-title")?.textContent.toLowerCase() || "";
    const meta =
      card.querySelector(".video-meta")?.textContent.toLowerCase() || "";
    const content = title + " " + meta;

    const shouldShow =
      keywords.length === 0 ||
      keywords.some((kw) => content.includes(kw.toLowerCase()));

    if (shouldShow) {
      targetContainer.appendChild(card.cloneNode(true));
    }
  });

  if (targetContainer.children.length === 0) {
    targetContainer.innerHTML =
      '<p class="empty-state">Không tìm thấy video phù hợp.</p>';
  }
}

/* --- CODING GAMES SYSTEM --- */

const GAME_DATA = {
  quiz: [
    {
      question: "typeof null trả về gì?",
      options: ["object", "null", "undefined", "number"],
      correct: 0,
    },
    {
      question: "Phương thức nào chuyển JSON sang chuỗi?",
      options: [
        "JSON.parse()",
        "JSON.stringify()",
        "JSON.toString()",
        "JSON.convert()",
      ],
      correct: 1,
    },
    {
      question: "CSS: display: flex mặc định flex-direction là?",
      options: ["column", "row", "row-reverse", "inline"],
      correct: 1,
    },
    {
      question: "Thẻ HTML nào tạo danh sách có thứ tự?",
      options: ["<ul>", "<dl>", "<ol>", "<li>"],
      correct: 2,
    },
    {
      question: "Operator '===' so sánh gì?",
      options: ["Giá trị", "Kiểu dữ liệu", "Cả hai", "Không gì cả"],
      correct: 2,
    },
    {
      question: "DOM là viết tắt của?",
      options: [
        "Data Object Model",
        "Document Object Model",
        "Digital Object Mode",
        "Document Over Model",
      ],
      correct: 1,
    },
    {
      question: "Sự kiện click trong React viết là?",
      options: ["onclick", "onClick", "on-click", "@click"],
      correct: 1,
    },
    {
      question: "var, let, const: cái nào có block scope?",
      options: ["var", "let, const", "tất cả", "không cái nào"],
      correct: 1,
    },
  ],
  debug: [
    {
      code: "function sum(a, b) {\n  return a + b;\n// Thiếu dấu } để kết thúc hàm\n\nconsole.log(sum(5, 10)); // In ra 15",
      answer: "}",
    },
    {
      code: "const colors = ['red', 'green', 'blue'];\nconsole.log(colors[3]); // Mong muốn 'blue' nhưng index 3 không tồn tại",
      answer: "2",
    },
    {
      code: "let x = 10;\nif (x = 20) {\n  console.log('Equal');\n} // Sử dụng assignment thay vì comparison",
      answer: "==",
    },
    {
      code: "document.getElementById('btn').addEventListner('click', run); // Sai chính tả",
      answer: "addEventListener",
    },
    {
      code: "const arr = [1, 2, 3];\nconsole.log(arr.lenght); // Sai chính tả",
      answer: "length",
    },
    {
      code: "let x = '5';\nif (x === 5) {\n  console.log('Equal');\n} // Sai kiểu dữ liệu",
      answer: "==",
    },
    {
      code: "const obj = {name: 'John'};\nconsole.log(obj.nmae); // Sai chính tả",
      answer: "name",
    },
    {
      code: "let arr = [1, 2, 3];\narr = arr.map(x => x * 2); // Thiếu return statement",
      answer: "return x => x * 2",
    },
  ],
  fill: [
    {
      code: "let numbers = [1, 2, 3];\nnumbers.__(4); // Thêm vào cuối",
      answer: "push",
    },
    {
      code: "document.__( 'h1' ); // Chọn thẻ theo CSS selector",
      answer: "querySelector",
    },
    { code: "localStorage.__( 'key', 'value' );", answer: "setItem" },
    {
      code: "setTimeout(() => console.log('Hi'), 1000); // Đơn vị là __",
      answer: "ms",
    },
    {
      code: "const users = [{name: 'John'}];\nconst names = users.map(u => u.__);",
      answer: "name",
    },
    {
      code: "function greet(name) {\n  return `Hello, ${__}!`;\n}",
      answer: "name",
    },
  ],
  output: [
    {
      code: "console.log(2 + '2');",
      options: ["4", "22", "NaN", "Error"],
      correct: 1,
    },
    {
      code: "console.log(Boolean(''));",
      options: ["true", "false", "undefined", "null"],
      correct: 1,
    },
    {
      code: "console.log(typeof NaN);",
      options: ["number", "NaN", "undefined", "object"],
      correct: 0,
    },
    {
      code: "let a = [1, 2]; let b = a; b.push(3); console.log(a);",
      options: ["[1, 2]", "[1, 2, 3]", "[1, 2, 3, 3]", "Error"],
      correct: 1,
    },
  ],
  puzzle: [
    {
      lines: [
        "function sayHello() {",
        "  console.log('Hello');",
        "}",
        "sayHello();",
      ],
    },
    {
      lines: [
        "const btn = document.querySelector('button');",
        "btn.addEventListener('click', () => {",
        "  alert('Clicked!');",
        "});",
      ],
    },
    {
      lines: [
        "let i = 0;",
        "while (i < 5) {",
        "  console.log(i);",
        "  i++;",
        "}",
      ],
    },
  ],
  flashcards: [
    { term: "Hoisted", desc: "Cơ chế đưa khai báo biến/hàm lên đầu phạm vi." },
    {
      term: "Closure",
      desc: "Hàm nhớ được phạm vi lexcial (biến bên ngoài) nơi nó được tạo ra.",
    },
    {
      term: "Promise",
      desc: "Đối tượng đại diện cho kết quả của tác vụ bất đồng bộ.",
    },
    { term: "Event Bubbling", desc: "Sự kiện nổi bọt từ phần tử con lên cha." },
    {
      term: "API",
      desc: "Application Programming Interface - Giao diện lập trình ứng dụng.",
    },
  ],
  multichoice: [
    {
      question: "Các kiểu dữ liệu nguyên thủy trong JS?",
      options: ["String", "Number", "Array", "Boolean", "Object", "null", "undefined"],
      correct: [0, 1, 3, 5, 6],
    },
    {
      question: "Thẻ HTML nào là inline?",
      options: ["div", "span", "a", "p", "img", "h1", "section"],
      correct: [1, 2, 4],
    },
    {
      question: "Framework/Library của JS?",
      options: ["React", "Laravel", "Vue", "Django", "Angular", "jQuery", "Express"],
      correct: [0, 2, 4, 5],
    },
    {
      question: "Các phương thức array trong JS?",
      options: ["push()", "pop()", "shift()", "unshift()", "splice()", "sort()", "reverse()"],
      correct: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      question: "Các hook phổ biến trong React?",
      options: ["useState", "useEffect", "useContext", "useReducer", "useMemo", "useCallback"],
      correct: [0, 1, 2, 3, 4, 5],
    },
  ],
  typing: [
    "const sum = (a, b) => a + b;",
    "document.getElementById('root').innerHTML = 'Hello';",
    "import React, { useState } from 'react';",
    "export default function App() { return <h1>Hi</h1>; }",
    "array.filter(item => item.active).map(i => i.value);",
  ],
  // --- NEW GAMES ---
  sql: [
    { type: "fill", code: "SELECT * __ users WHERE id = 1;", answer: "FROM" },
    {
      type: "quiz",
      question: "Lệnh nào dùng để thêm dữ liệu?",
      options: ["INSERT", "UPDATE", "ADD", "CREATE"],
      correct: 0,
    },
    {
      type: "fill",
      code: "SELECT count(*) FROM orders GROUP __ user_id;",
      answer: "BY",
    },
    {
      type: "quiz",
      question: "Khoá chính trong SQL là gì?",
      options: ["PRIMARY KEY", "UNIQUE KEY", "FOREIGN KEY", "MAIN KEY"],
      correct: 0,
    },
    { type: "fill", code: "DELETE FROM users __ id = 5;", answer: "WHERE" },
  ],
  css: [
    {
      type: "quiz",
      question: "CSS là viết tắt của?",
      options: [
        "Cascading Style Sheets",
        "Creative Style System",
        "Computer Style Sheets",
        "Colorful Style Sheets",
      ],
      correct: 0,
    },
    {
      type: "fill",
      code: "display: __; // Để căn giữa 2 chiều dễ nhất",
      answer: "flex",
    },
    {
      type: "quiz",
      question: "Thuộc tính nào đổi màu chữ?",
      options: ["color", "font-color", "text-color", "background"],
      correct: 0,
    },
    {
      type: "fill",
      code: "div { margin: 0 __; } // Căn giữa block ngang",
      answer: "auto",
    },
    {
      type: "quiz",
      question: "z-index chỉ hoạt động khi position là?",
      options: ["relative/absolute/fixed", "static", "block", "inline"],
      correct: 0,
    },
  ],
  algorithm: [
    {
      type: "quiz",
      question: "Độ phức tạp của Binary Search?",
      options: ["O(log n)", "O(n)", "O(n^2)", "O(1)"],
      correct: 0,
    },
    {
      type: "fill",
      code: "// Bubble Sort Loop\nfor (let i=0; i<n; i++) {\n  for (let j=0; j<n-i-1; j++) {\n    if (arr[j] __ arr[j+1]) swap();\n  }\n}",
      answer: ">",
    },
    {
      type: "quiz",
      question: "Cấu trúc dữ liệu nào theo LIFO?",
      options: ["Stack", "Queue", "Array", "Tree"],
      correct: 0,
    },
    {
      type: "fill",
      code: "// Đệ quy tính giai thừa\nfunction fact(n) {\n  if(n==0) return 1;\n  return n * __(n-1);\n}",
      answer: "fact",
    },
  ],
  regex: [
    {
      type: "quiz",
      question: "/\\d+/ khớp với gì?",
      options: ["Số", "Chữ cái", "Khoảng trắng", "Ký tự đặc biệt"],
      correct: 0,
    },
    {
      type: "fill",
      code: "const regex = /hello/__.test('HELLO'); // Case insensitive",
      answer: "i",
    },
    {
      type: "quiz",
      question: "Ký tự nào đại diện bắt đầu chuỗi?",
      options: ["^", "$", "*", "?"],
      correct: 0,
    },
    {
      type: "fill",
      code: "/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/__; // Email regex",
      answer: "",
    },
    {
      type: "quiz",
      question: "Regex flag nào cho multiline?",
      options: ["g", "i", "m", "s"],
      correct: 2,
    },
  ],
  bug_buster: [
    {
      type: "debug",
      code: "function add(a, b) {\n  return a - b; // Should sum\n}",
      answer: "+",
    },
    {
      type: "debug",
      code: "let x = 10;\nif (x = 5) { // Assignment instead of comparison\n  console.log('Equal');\n}",
      answer: "==",
    },
    {
      type: "debug",
      code: "const arr = [1, 2];\narr = [3, 4]; // Cannot reassign const",
      answer: "let",
    },
    {
      type: "debug",
      code: "document.getElementById('btn').onclick = () => {\n  console.log(this); // Arrow function loses 'this'\n}",
      answer: "function",
    },
    {
      type: "debug",
      code: "const obj = {name: 'John'};\nconsole.log(obj.nmae); // Typo in property",
      answer: "name",
    },
    {
      type: "debug",
      code: "let x = '5';\nif (x === 5) {\n  console.log('Equal');\n} // Type mismatch",
      answer: "==",
    },
  ],
  react: [
    {
      type: "quiz",
      question: "Hook nào dùng để quản lý side-effects?",
      options: ["useEffect", "useState", "useContext", "useReducer"],
      correct: 0,
    },
    {
      type: "fill",
      code: "const [count, setCount] = __(0);",
      answer: "useState",
    },
    {
      type: "quiz",
      question: "JSX là viết tắt của?",
      options: [
        "JavaScript XML",
        "Java Syntax Extension",
        "JSON Xylophone",
        "JS XML",
      ],
      correct: 0,
    },
    {
      type: "fill",
      code: "useEffect(() => {\n  console.log('Mounted');\n}, __); // Empty array",
      answer: "[]",
    },
    {
      type: "debug",
      code: "return (\n  <h1>Hello</h1>\n  <p>World</p> // Missing fragment\n)",
      answer: "<>",
    },
    {
      type: "quiz",
      question: "Props trong React là?",
      options: ["Mutable", "Immutable", "Có thể thay đổi", "Tự động update"],
      correct: 1,
    },
    {
      type: "fill",
      code: "const Component = (__) => {\n  return <div>Hello</div>;\n};",
      answer: "props",
    },
  ],
  node: [
    {
      type: "quiz",
      question: "Framework phổ biến nhất cho Node.js?",
      options: ["Express", "Django", "Laravel", "Spring"],
      correct: 0,
    },
    {
      type: "fill",
      code: "app.__(3000, () => console.log('Run'));",
      answer: "listen",
    },
    {
      type: "quiz",
      question: "Biến toàn cục __dirname là gì?",
      options: [
        "Đường dẫn thư mục hiện tại",
        "Tên file hiện tại",
        "Tên user",
        "Home dir",
      ],
      correct: 0,
    },
    { type: "fill", code: "const fs = require('__');", answer: "fs" },
    {
      type: "quiz",
      question: "Phương thức nào đọc file bất đồng bộ?",
      options: ["fs.readFileSync", "fs.readFile", "fs.read", "fs.open"],
      correct: 1,
    },
    {
      type: "fill",
      code: "const http = require('http');\nconst server = http.createServer((__, res) => {\n  res.end('Hello');\n});",
      answer: "req",
    },
  ],
  python: [
    {
      type: "quiz",
      question: "Cách khai báo hàm trong Python?",
      options: [
        "def my_func():",
        "function myFunc()",
        "func myFunc()",
        "define my()",
      ],
      correct: 0,
    },
    {
      type: "fill",
      code: "print('Hello ' __ 'World') # Concatenation",
      answer: "+",
    },
    {
      type: "quiz",
      question: "List trong Python tương đương gì trong JS?",
      options: ["Array", "Object", "Set", "Map"],
      correct: 0,
    },
    { type: "fill", code: "for i __ range(5):", answer: "in" },
    {
      type: "debug",
      code: "if x > 5\n  print('Yes') # Missing colon",
      answer: ":",
    },
    {
      type: "quiz",
      question: "Từ khóa nào khai báo class trong Python?",
      options: ["class", "def", "function", "object"],
      correct: 0,
    },
    {
      type: "fill",
      code: "my_list = [1, 2, 3]\nprint(len(__)) # In ra 3",
      answer: "my_list",
    },
  ],
};

let currentGame = {
  type: null,
  data: [],
  currentIndex: 0,
  score: 0,
  timer: null,
  timeLeft: 60,
};

// Initialize Games
function initCodingGames() {
  updateGameHeader();
  checkDailyStreak();
}

// Update Header Stats
function updateGameHeader() {
  const coins = parseInt(localStorage.getItem("game_coins") || 0);
  const streak = parseInt(localStorage.getItem("game_streak") || 0);
  const xp = parseInt(localStorage.getItem("game_xp") || 0);

  // Level calc: 1 level per 100 XP
  const level = Math.floor(xp / 100) + 1;
  const xpProgress = xp % 100;

  document.getElementById("player-coins").textContent = coins;
  document.getElementById("player-streak").textContent = streak;
  document.getElementById("player-level").textContent = `Level ${level}`;
  document.getElementById("player-xp-bar").style.width = `${xpProgress}%`;

  // Save global level
  localStorage.setItem("game_level", level);
}

// Streak Logic
function checkDailyStreak() {
  const lastPlayed = localStorage.getItem("game_last_played");
  const today = new Date().toDateString();

  if (lastPlayed !== today) {
    // Logic to check missed days could go here
    // For specific demo, we just rely on play action to update
  }
}

function updateStreak() {
  const lastPlayed = localStorage.getItem("game_last_played");
  const today = new Date().toDateString();

  if (lastPlayed !== today) {
    let streak = parseInt(localStorage.getItem("game_streak") || 0);
    // If last played was yesterday, increment. Else reset.
    // For simplicity: Increment if not today.
    streak++;
    localStorage.setItem("game_streak", streak);
    localStorage.setItem("game_last_played", today);
    updateGameHeader();

    // Bonus for 7 days
    if (streak % 7 === 0) addReward(50, 100);
  }
}

// Start Game Entry
window.startGame = function (type) {
  currentGame.type = type;
  currentGame.currentIndex = 0;
  currentGame.score = 0;
  currentGame.timeLeft = type === "typing" ? 30 : 60;

  // Load specific game data
  if (type === "daily") {
    // Pick 3 random Qs
    currentGame.data = [...GAME_DATA.quiz]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
  } else if (type === "debug" || type === "fill" || type === "typing") {
    currentGame.data = [...GAME_DATA[type]].sort(() => 0.5 - Math.random());
  } else {
    currentGame.data = GAME_DATA[type]
      ? [...GAME_DATA[type]].sort(() => 0.5 - Math.random())
      : [];
  }

  showGameModal();
  renderGameQuestion();
  startTimer();
};

function showGameModal() {
  document.getElementById("game-modal").style.display = "flex";
  document.getElementById("game-title").textContent = getGameTitle(
    currentGame.type
  );
  document.getElementById("game-feedback").textContent = "";
  document.getElementById("game-feedback").className = "game-feedback";
}

window.closeGameModal = function () {
  document.getElementById("game-modal").style.display = "none";
  clearInterval(currentGame.timer);
  updateGameHeader(); // Sync stats
};

function getGameTitle(type) {
  const titles = {
    quiz: "📝 Code Quiz",
    debug: "🐛 Debug Master",
    fill: "✏️ Fill the Code",
    typing: "⚡ Speed Typing",
    puzzle: "🧩 Code Puzzle",
    output: "🎯 Output Guess",
    daily: "🏆 Daily Challenge",
    flashcards: "🃏 Flashcards",
    multichoice: "✅ Multichoice",
    sql: "🗄️ SQL Master",
    css: "🎨 CSS Visualizer",
    algorithm: "🧠 Algo Arena",
    regex: "🧩 Regex Riddle",
    bug_buster: "🐛 Bug Buster",
    react: "⚛️ React Reactor",
    node: "🐢 Node.js Ninja",
    python: "🐍 Python Pygmy",
  };
  return titles[type] || "Game";
}

function startTimer() {
  clearInterval(currentGame.timer);
  if (currentGame.type === "flashcards") {
    document.getElementById("game-timer").style.display = "none";
    return;
  }

  document.getElementById("game-timer").style.display = "block";
  document.getElementById("game-timer").textContent =
    currentGame.timeLeft + "s";

  currentGame.timer = setInterval(() => {
    currentGame.timeLeft--;
    document.getElementById("game-timer").textContent =
      currentGame.timeLeft + "s";
    if (currentGame.timeLeft <= 0) {
      clearInterval(currentGame.timer);
      handleTimeOut();
    }
  }, 1000);
}

function handleTimeOut() {
  const container = document.getElementById("game-area");
  container.innerHTML = `<h2 style="text-align:center; color:#ea4335">Hết giờ! ⏰</h2>`;
  setTimeout(closeGameModal, 2000);
}

// Rendering Logic
function renderGameQuestion() {
  const container = document.getElementById("game-area");
  const index = currentGame.currentIndex;
  const data = currentGame.data[index];

  if (!data) {
    finishGame();
    return;
  }

  container.innerHTML = "";

  switch (currentGame.type) {
    case "quiz":
    case "output":
    case "daily":
      renderQuiz(container, data);
      break;
    case "debug":
      renderDebug(container, data);
      break;
    case "fill":
      renderFill(container, data);
      break;
    case "typing":
      renderTyping(container, data);
      break;
    case "flashcards":
      renderFlashcard(container, data);
      break;
    case "puzzle":
      renderPuzzle(container, data);
      break;
    case "multichoice":
      renderQuiz(container, data); // Use renderQuiz for multichoice
      break;

    // Generic handler for mixed types (React, Node, SQL etc.)
    case "sql":
    case "css":
    case "algorithm":
    case "regex":
    case "bug_buster":
    case "react":
    case "node":
    case "python":
      // Check data specific type or default to quiz
      if (data.type === "fill") renderFill(container, data);
      else if (data.type === "debug") renderDebug(container, data);
      else if (data.type === "typing") renderTyping(container, data);
      else renderQuiz(container, data);
      break;
  }
}

// Reward logic
function addReward(coins, xp) {
  let currentCoins = parseInt(localStorage.getItem("game_coins") || 0);
  let currentXP = parseInt(localStorage.getItem("game_xp") || 0);

  localStorage.setItem("game_coins", currentCoins + coins);
  localStorage.setItem("game_xp", currentXP + xp);

  // Show feedback
  const feedback = document.getElementById("game-feedback");
  feedback.textContent = `+${coins} 🪙  +${xp} XP`;
  feedback.className = "game-feedback success";

  updateGameHeader();
}

// --- Specific Game Renderers ---

function renderQuiz(container, data) {
  const qEl = document.createElement("h3");
  qEl.textContent = data.question || data.code;
  if (currentGame.type === "output") qEl.className = "code-block";

  const optsDiv = document.createElement("div");
  optsDiv.className = "options-grid";

  // Check if this is multichoice
  const isMultichoice = Array.isArray(data.correct);

  data.options.forEach((opt, idx) => {
    const btn = document.createElement("div");
    btn.className = "game-option";
    btn.textContent = opt;
    btn.dataset.idx = idx;

    if (isMultichoice) {
      // Multichoice: allow multiple selections
      btn.onclick = () => {
        btn.classList.toggle("selected");
      };
      // Add submit button for multichoice
      if (idx === data.options.length - 1) {
        const submitBtn = document.createElement("button");
        submitBtn.className = "btn-primary";
        submitBtn.textContent = "Gửi câu trả lời";
        submitBtn.style.marginTop = "20px";
        submitBtn.onclick = () => checkMultichoiceAnswer(data.correct);
        optsDiv.appendChild(submitBtn);
      }
    } else {
      // Single choice
      btn.onclick = () => checkQuizAnswer(btn, idx, data.correct);
    }

    optsDiv.appendChild(btn);
  });

  container.append(qEl, optsDiv);
}

function checkMultichoiceAnswer(correct) {
  const selected = Array.from(
    document.querySelectorAll(".game-option.selected")
  ).map((el) => parseInt(el.dataset.idx));

  const isCorrect =
    selected.length === correct.length &&
    selected.every((val) => correct.includes(val));

  if (isCorrect) {
    document.querySelectorAll(".game-option.selected").forEach(el => el.classList.add("correct"));
    addReward(15, 20);
    setTimeout(nextQuestion, 1000);
  } else {
    document.querySelectorAll(".game-option").forEach(el => {
      const idx = parseInt(el.dataset.idx);
      if (correct.includes(idx)) {
        el.classList.add("correct");
      } else if (el.classList.contains("selected")) {
        el.classList.add("wrong");
      }
    });
    currentGame.timeLeft -= 10; // Higher penalty for multichoice
    document.getElementById("game-feedback").textContent = "Sai rồi! Đáp án đúng đã được đánh dấu.";
    document.getElementById("game-feedback").className = "game-feedback error";
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  }
}

function checkQuizAnswer(btn, selectedIdx, correctIdx) {
  const allOptions = document.querySelectorAll(".game-option");

  if (selectedIdx === correctIdx) {
    // Correct answer
    btn.classList.add("correct");
    addReward(10, 15);
    setTimeout(nextQuestion, 1000);
  } else {
    // Wrong answer
    btn.classList.add("wrong");
    // Show correct answer
    allOptions[correctIdx].classList.add("correct");
    currentGame.timeLeft -= 5; // Penalty for wrong answer
    document.getElementById("game-feedback").textContent = "Sai rồi! Đáp án đúng đã được đánh dấu.";
    document.getElementById("game-feedback").className = "game-feedback error";
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  }
}

function renderDebug(container, data) {
  // Simple approach: highlight the error based on the answer
  let highlightedCode = data.code;

  // Try to highlight the error based on the answer
  if (data.answer === "}") {
    highlightedCode = highlightedCode.replace(/\n\nconsole/, '\n<span class="bug-highlight">// Thiếu dấu }</span>\nconsole');
  } else if (data.answer === "2") {
    highlightedCode = highlightedCode.replace(/colors\[3\]/, 'colors[<span class="bug-highlight">3</span>]');
  } else if (data.answer === "==") {
    highlightedCode = highlightedCode.replace(/x = 20/, 'x <span class="bug-highlight">=</span> 20');
  } else if (data.answer === "addEventListener") {
    highlightedCode = highlightedCode.replace(/addEventListner/, '<span class="bug-highlight">addEventListner</span>');
  } else if (data.answer === "length") {
    highlightedCode = highlightedCode.replace(/lenght/, '<span class="bug-highlight">lenght</span>');
  } else if (data.answer === "===") {
    highlightedCode = highlightedCode.replace(/=== 5/, '<span class="bug-highlight">===</span> 5');
  } else if (data.answer === "name") {
    highlightedCode = highlightedCode.replace(/nmae/, '<span class="bug-highlight">nmae</span>');
  } else if (data.answer === "return x => x * 2") {
    highlightedCode = highlightedCode.replace(/x => x \* 2/, '<span class="bug-highlight">x => x * 2</span>');
  } else {
    // Generic highlighting - highlight the answer if it appears in code
    const answerRegex = new RegExp(data.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    highlightedCode = highlightedCode.replace(answerRegex, `<span class="bug-highlight">${data.answer}</span>`);
  }

  container.innerHTML = `
    <p>Tìm và sửa lỗi trong code (phần được highlight):</p>
    <div class="code-block" style="white-space: pre;">${escapeHtml(highlightedCode)}</div>
    <input type="text" id="debug-input" placeholder="Nhập code đúng để thay thế..." style="width:100%; padding:10px; margin-top:10px;">
    <button class="btn-primary" onclick="checkDebugAnswer('${data.answer}')">Kiểm tra</button>
  `;
}

window.checkDebugAnswer = function (correctAnswer) {
  const input = document.getElementById("debug-input");
  const userAnswer = input.value.trim();

  if (!userAnswer) {
    document.getElementById("game-feedback").textContent = "Vui lòng nhập câu trả lời!";
    document.getElementById("game-feedback").className = "game-feedback error";
    input.focus();
    return;
  }

  if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
    input.style.borderColor = "#34a853";
    addReward(15, 15);
    setTimeout(nextQuestion, 1000);
  } else {
    input.style.borderColor = "#ea4335";
    input.classList.add("shake");
    document.getElementById("game-feedback").textContent = "Sai rồi! Thử lại.";
    document.getElementById("game-feedback").className = "game-feedback error";
    setTimeout(() => {
      input.classList.remove("shake");
      input.style.borderColor = "";
      input.focus();
    }, 500);
  }
};

function renderFill(container, data) {
  const parts = data.code.split("__");
  container.innerHTML = `
    <div class="code-block">
      ${escapeHtml(parts[0])}
      <input type="text" class="code-input" id="fill-input">
      ${escapeHtml(parts[1] || "")}
    </div>
    <button class="btn-primary" onclick="checkFillAnswer('${
      data.answer
    }')">Kiểm tra</button>
  `;
  setTimeout(() => document.getElementById("fill-input").focus(), 100);
}

window.checkFillAnswer = function (answer) {
  const input = document.getElementById("fill-input");
  const userAnswer = input.value.trim();

  if (!userAnswer) {
    document.getElementById("game-feedback").textContent = "Vui lòng nhập câu trả lời!";
    document.getElementById("game-feedback").className = "game-feedback error";
    input.focus();
    return;
  }

  const correctAnswer = answer.toLowerCase();

  if (userAnswer.toLowerCase() === correctAnswer) {
    input.style.borderColor = "#34a853";
    addReward(10, 10);
    setTimeout(nextQuestion, 1000);
  } else {
    input.style.borderColor = "#ea4335";
    input.classList.add("shake");
    document.getElementById("game-feedback").textContent = "Sai rồi! Thử lại.";
    document.getElementById("game-feedback").className = "game-feedback error";
    setTimeout(() => {
      input.classList.remove("shake");
      input.style.borderColor = "";
      input.focus();
    }, 500);
  }
};

function renderTyping(container, data) {
  container.innerHTML = `
    <div class="typing-area" id="typing-target">${data
      .split("")
      .map((char) => `<span class="typing-char">${escapeHtml(char)}</span>`)
      .join("")}</div>
    <textarea id="typing-input" style="opacity:0; position:absolute;"></textarea>
    <div style="margin-top:20px; text-align:center; color:#666;">Gõ phím bất kỳ để bắt đầu...</div>
  `;

  const input = document.getElementById("typing-input");
  const targetChars = document.querySelectorAll(".typing-char");
  input.focus();
  input.onblur = () => input.focus();

  input.oninput = (e) => {
    const val = input.value;
    let correctCount = 0;

    targetChars.forEach((span, idx) => {
      const char = val[idx];
      if (char == null) {
        span.className = "typing-char";
        if (idx === val.length) span.classList.add("current");
      } else if (char === span.textContent) {
        span.className = "typing-char correct";
        correctCount++;
      } else {
        span.className = "typing-char wrong";
      }
    });

    if (correctCount === data.length) {
      addReward(20, 20);
      setTimeout(nextQuestion, 500);
    }
  };
}

function renderFlashcard(container, data) {
  container.innerHTML = `
    <div class="flashcard-container" onclick="this.firstElementChild.classList.toggle('flipped')">
      <div class="flashcard">
        <div class="flashcard-front">${data.term}</div>
        <div class="flashcard-back">${data.desc}</div>
      </div>
    </div>
    <div class="flashcard-actions">
      <button class="btn-secondary" onclick="nextQuestion()">Tiếp theo ➡️</button>
    </div>
  `;
}

function renderPuzzle(container, data) {
  // Simple version: Render randomized lines, click to swap? Or just numbered inputs.
  // For prototype: List of lines, user clicks in order.
  const shuffled = [...data.lines].sort(() => 0.5 - Math.random());

  container.innerHTML = `<p>Chọn các dòng code theo đúng thứ tự:</p><div id="puzzle-lines" class="puzzle-container"></div>`;
  const pContainer = document.getElementById("puzzle-lines");

  shuffled.forEach((line) => {
    const div = document.createElement("div");
    div.className = "puzzle-line";
    div.textContent = line;
    div.onclick = () => {
      div.style.display = "none";
      checkPuzzleOrder(line, data.lines);
    };
    pContainer.appendChild(div);
  });

  window.puzzleProgress = 0;
}

function checkPuzzleOrder(line, correctLines) {
  if (line === correctLines[window.puzzleProgress]) {
    window.puzzleProgress++;
    if (window.puzzleProgress === correctLines.length) {
      addReward(15, 25);
      setTimeout(nextQuestion, 1000);
    }
  } else {
    document.getElementById("game-feedback").textContent = "Sai thứ tự! Thử lại.";
    document.getElementById("game-feedback").className = "game-feedback error";
    setTimeout(() => {
      renderPuzzle(document.getElementById("game-area"), { lines: correctLines });
    }, 1500);
  }
}

// Engine Utils
function nextQuestion() {
  updateStreak(); // Update streak on any successful answer activity
  currentGame.currentIndex++;
  document.getElementById("game-feedback").textContent = "";
  renderGameQuestion();
}

function finishGame() {
  const container = document.getElementById("game-area");
  container.innerHTML = `
    <div style="text-align:center">
      <h2>🎉 Hoàn thành!</h2>
      <p>Bạn đã nhận được nhiều Coins & XP.</p>
      <button class="btn-primary" onclick="closeGameModal()">Đóng</button>
    </div>
  `;
  clearInterval(currentGame.timer);
}

// Init Games on Load
document.addEventListener("DOMContentLoaded", initCodingGames);

/**
 * SEARCH FUNCTIONALITY
 */
function setupSearch() {
  const searchInputs = document.querySelectorAll(".search-input");
  const searchButtons = document.querySelectorAll(".search-button");

  function performSearch(query) {
    const videos = document.querySelectorAll("#view-home .video-card");
    const lowerQuery = query.toLowerCase();

    videos.forEach((video) => {
      const title =
        video.querySelector(".video-title")?.textContent.toLowerCase() || "";
      const meta =
        video.querySelector(".video-meta")?.textContent.toLowerCase() || "";

      if (
        title.includes(lowerQuery) ||
        meta.includes(lowerQuery) ||
        query === ""
      ) {
        video.style.display = "flex";
      } else {
        video.style.display = "none";
      }
    });
  }

  searchInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      performSearch(e.target.value.trim());
    });
  });

  searchButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      const query = searchInputs[index]?.value.trim() || "";
      performSearch(query);
    });
  });

  searchInputs.forEach((input, index) => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        performSearch(input.value.trim());
      }
    });
  });
}

/**
 * CATEGORY FILTERS
 */
function setupCategoryFilters() {
  const categoryItems = document.querySelectorAll(".category-item");
  const videos = document.querySelectorAll("#view-home .video-card");
  const videoGrid = document.querySelector("#view-home .video-grid");

  const categoryKeywords = {
    "Tất cả": [],
    "Âm nhạc": ["music", "nhạc", "song", "melody"],
    "Trò chơi": ["game", "trò chơi", "gaming", "esports"],
    "Tin tức": ["news", "tin", "thời sự"],
    "Công nghệ": [
      "tech",
      "công nghệ",
      "javascript",
      "programming",
      "html",
      "css",
      "sql",
      "react",
      "git",
      "docker",
      "php",
      "sass",
      "cloud",
      "devops",
      "llm",
      "machine learning",
      "framework",
      "ui/ux",
      "figma",
    ],
    "Du lịch": ["travel", "du lịch", "tour"],
    "Thể thao": ["sport", "thể thao", "football", "bóng đá"],
    "Giáo dục": [
      "education",
      "giáo dục",
      "học",
      "tutorial",
      "khóa học",
      "hướng dẫn",
      "course",
    ],
    "Trực tiếp": ["live", "trực tiếp", "stream"],
    "Phim ảnh": ["movie", "phim", "film", "cinema"],
    "Thời trang": ["fashion", "thời trang", "style"],
    "Ẩm thực": ["food", "ẩm thực", "cooking", "nấu ăn"],
    "Đã xem": [],
    "Đề Xuất": [],
  };

  categoryItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();

      categoryItems.forEach((cat) => {
        cat.classList.remove("active");
        cat.removeAttribute("aria-current");
      });
      item.classList.add("active");
      item.setAttribute("aria-current", "page");

      const categoryName = item.textContent.trim();
      let emptyState = videoGrid?.querySelector(".category-empty-state");
      if (!emptyState && videoGrid) {
        emptyState = document.createElement("p");
        emptyState.className = "category-empty-state empty-state";
        emptyState.setAttribute("role", "status");
        videoGrid.appendChild(emptyState);
      }

      const updateVisibility = (predicate) => {
        let visibleCount = 0;
        videos.forEach((video) => {
          const visible = predicate(video);
          video.style.display = visible ? "flex" : "none";
          if (visible) visibleCount += 1;
        });
        if (emptyState) {
          emptyState.textContent = `Chưa có video trong danh mục “${categoryName}”.`;
          emptyState.style.display = visibleCount === 0 ? "block" : "none";
        }
      };

      // Special handling for "Đề Xuất" - personalized recommendations
      if (categoryName === "Đề Xuất") {
        handleRecommendationCategory();
        if (emptyState) {
          const hasVisibleVideo = [...videos].some((video) => video.style.display !== "none");
          emptyState.textContent = "Chưa có video đề xuất phù hợp.";
          emptyState.style.display = hasVisibleVideo ? "none" : "block";
        }
        return;
      }

      // Special handling for "Đã xem" - show watched videos
      if (categoryName === "Đã xem") {
        const history = getStoredArray(STORAGE_KEYS.HISTORY);
        const watchedIds = new Set(history.map((video) => video.id));
        updateVisibility((video) => {
          const videoId = video.querySelector("iframe")?.src?.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1];
          return watchedIds.has(videoId);
        });
        return;
      }

      const keywords = categoryKeywords[categoryName] || [];

      updateVisibility((video) => {
        if (categoryName === "Tất cả" || keywords.length === 0) return true;
        const title = video.querySelector(".video-title")?.textContent.toLowerCase() || "";
        const meta = video.querySelector(".video-meta")?.textContent.toLowerCase() || "";
        const content = `${title} ${meta}`;
        return keywords.some((keyword) => content.includes(keyword.toLowerCase()));
      });
    });
  });
}

/**
 * SETTINGS
 */
function setupSettings() {
  // New settings logic can be implemented here later
}

/**
 * GEMINI CHAT WIDGET
 */
function setupGeminiChat() {
  const openBtn = document.getElementById("open-chat-btn");
  const closeBtn = document.getElementById("close-chat");
  const widget = document.getElementById("gemini-chat-widget");
  const sendBtn = document.getElementById("send-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const input = document.getElementById("chat-input");
  const messagesContainer = document.getElementById("chat-messages");

  if (!widget) return;

  let currentAbortController = null;
  let isProcessing = false;

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      widget.classList.add("active");
      input.focus();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => widget.classList.remove("active"));
  }

  function setProcessingState(processing) {
    isProcessing = processing;
    if (processing) {
      sendBtn.style.display = "none";
      cancelBtn.classList.add("visible");
      input.disabled = true;
    } else {
      sendBtn.style.display = "flex";
      cancelBtn.classList.remove("visible");
      input.disabled = false;
      input.focus();
    }
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
        setProcessingState(false);
        addMessage("🛑 Đã hủy yêu cầu.", "system");
      }
    });
  }

  async function handleSend() {
    const text = input.value.trim();
    if (!text || isProcessing) return;

    // Clear input immediately
    input.value = "";

    // User message
    addMessage(text, "human");

    const loadingId = addLoadingMessage();
    setProcessingState(true);

    // Create AbortController if needed for cancellation (backend support pending)
    currentAbortController = new AbortController();

    try {
      // Call Proxy API (No API Key needed here)
      const response = await callGeminiAPI(text);
      removeMessage(loadingId);
      addMessage(response, "ai");
    } catch (error) {
      removeMessage(loadingId);
      if (error.name !== "AbortError") {
        // User-friendly error messages
        let errorMsg = "❌ Đã xảy ra lỗi. ";
        if (error.message.includes("kết nối")) {
          errorMsg += error.message;
        } else if (error.message.includes("server")) {
          errorMsg += "Server không phản hồi. Vui lòng thử lại sau.";
        } else {
          errorMsg += error.message || "Vui lòng thử lại.";
        }
        addMessage(errorMsg, "system");
        console.error("Gemini API Error:", error);
      }
    } finally {
      setProcessingState(false);
      currentAbortController = null;
    }
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", handleSend);
  }
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !isProcessing) handleSend();
    });
  }

  function addMessage(text, type) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${type}`;

    if (type === "ai") {
      msgDiv.innerHTML = parseMarkdown(text);
    } else {
      msgDiv.textContent = text;
    }

    messagesContainer.appendChild(msgDiv);
    scrollToBottom();
    return msgDiv;
  }

  function addLoadingMessage() {
    const id = "loading-" + Date.now();
    const msgDiv = document.createElement("div");
    msgDiv.className = "message system loading";
    msgDiv.id = id;
    msgDiv.textContent = "Gemini đang suy nghĩ...";
    messagesContainer.appendChild(msgDiv);
    scrollToBottom();
    return id;
  }

  function removeMessage(id) {
    const msg = document.getElementById(id);
    if (msg) msg.remove();
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

async function callGeminiAPI(prompt) {
  // Use environment variable or fallback to localhost
  const API_BASE_URL = window.API_BASE_URL || "http://localhost:5000";
  const url = `${API_BASE_URL}/api/gemini/chat`;

  try {
    const response = await fetch(url, {
      method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("auth_token")
            ? { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
            : {}),
        },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Lỗi server: ${response.status}. Vui lòng kiểm tra kết nối.`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error("Phản hồi từ server không đúng định dạng.");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    // Network errors
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo server đang chạy.");
    }
    throw error;
  }
}

function parseMarkdown(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

function escapeHtml(text) {
  text = String(text ?? "");
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/* --- NEW FEATURES: CREATE VIDEO, NOTIFICATIONS, ACCOUNT --- */

// Create Video Functions
function initCreateVideo() {
  const uploadArea = document.getElementById('upload-area');
  const videoFile = document.getElementById('video-file');
  const previewBtn = document.getElementById('preview-btn');
  const publishBtn = document.getElementById('publish-btn');

  if (!uploadArea) return;

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add("is-dragging");
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove("is-dragging");
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove("is-dragging");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleVideoFile(files[0]);
    }
  });

  // Click to select (chỉ khi không đang click vào video preview)
  uploadArea.addEventListener('click', (e) => {
    if (e.target.closest("video")) return;
    videoFile.click();
  });

  videoFile.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleVideoFile(e.target.files[0]);
    }
  });

  // Preview and Publish
  previewBtn.addEventListener('click', previewVideo);
  publishBtn.addEventListener('click', publishVideoLocally);

  // Refresh button cho "Video của tôi"
  const refreshBtn = document.getElementById('refresh-my-videos');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadMyVideos);
  }
}

function handleVideoFile(file) {
  const status = document.getElementById("upload-status");
  const fileExtension = file?.name?.split(".").pop()?.toLowerCase();
  const allowedExtensions = ["mp4", "webm", "ogg"];
  const allowedMimeTypes = ["video/mp4", "video/webm", "video/ogg"];
  const hasAllowedType =
    file &&
    (allowedMimeTypes.includes(file.type) ||
      (file.type === "" && allowedExtensions.includes(fileExtension)) ||
      allowedExtensions.includes(fileExtension));

  if (!hasAllowedType) {
    if (status) status.textContent = "Vui lòng chọn tệp MP4, WebM hoặc Ogg.";
    return;
  }
  selectedLocalVideo = file;
  const uploadArea = document.getElementById("upload-area");
  uploadArea.classList.add("has-file");
  uploadArea.querySelector("p").textContent = `Đã chọn: ${file.name}`;
  uploadArea.querySelector("small").textContent =
    `${formatFileSize(file.size)} · sẽ lưu trên thiết bị`;
  if (status) status.textContent = "Video đã sẵn sàng. Nhập tiêu đề và nhấn Lưu video!";
}

/**
 * Chuyển đổi byte sang đơn vị dễ đọc
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function previewVideo() {
  const title = document.getElementById('video-title').value;
  const description = document.getElementById('video-description').value;

  if (!selectedLocalVideo) {
    alert('Vui lòng chọn video!');
    return;
  }
  if (!title || !description) {
    alert('Vui lòng nhập tiêu đề và mô tả!');
    return;
  }

  const previewUrl = URL.createObjectURL(selectedLocalVideo);
  const preview = document.createElement("video");
  preview.controls = true;
  preview.src = previewUrl;
  preview.className = "local-video-preview";
  preview.addEventListener("click", (event) => event.stopPropagation());
  document.querySelector(".local-video-preview")?.remove();
  document.getElementById("upload-area").appendChild(preview);
}

/**
 * Lưu video trực tiếp trên thiết bị bằng IndexedDB.
 * Không đặt giới hạn dung lượng trong ứng dụng; giới hạn thực tế phụ thuộc trình duyệt.
 */
async function publishVideoLocally() {
  const title = document.getElementById('video-title').value;
  const description = document.getElementById('video-description').value;
  const publishBtn = document.getElementById('publish-btn');
  const status = document.getElementById("upload-status");

  if (!selectedLocalVideo) {
    alert('Vui lòng chọn video!');
    return;
  }
  if (!title) {
    alert('Vui lòng nhập tiêu đề video!');
    return;
  }

  // Hiển thị progress bar
  const progressContainer = document.getElementById("upload-progress-container");
  const progressFill = document.getElementById("upload-progress-fill");
  const progressText = document.getElementById("upload-progress-text");
  const progressPercent = document.getElementById("upload-progress-percent");
  const uploadSpeed = document.getElementById("upload-speed");

  if (progressContainer) progressContainer.style.display = "block";
  publishBtn.disabled = true;
  publishBtn.innerHTML = '<span class="material-icons" style="font-size:18px;vertical-align:middle;margin-right:4px;animation:spin 1s linear infinite;">sync</span> Đang lưu...';

  try {
    const video = {
      id: `${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(16).slice(2)}`,
      title: title.trim(),
      description: description.trim(),
      name: selectedLocalVideo.name,
      size: selectedLocalVideo.size,
      type: selectedLocalVideo.type,
      blob: selectedLocalVideo,
      createdAt: new Date().toISOString(),
    };
    await saveLocalVideo(video);

    if (status) status.textContent = "✅ Đã lưu video trên thiết bị!";
    if (progressText) progressText.textContent = "Lưu hoàn tất!";
    if (progressPercent) progressPercent.textContent = "100%";
    if (uploadSpeed) uploadSpeed.textContent = "";
    if (progressFill) {
      progressFill.style.width = "100%";
      progressFill.classList.add("success");
    }
    await renderLocalVideo(video);
    await loadMyVideos();
    setTimeout(() => resetUploadForm(), 1500);

  } catch (error) {
    console.error("Save local video error:", error);
    if (status) status.textContent = "❌ Không thể lưu video: " + error.message;
    if (progressText) progressText.textContent = "Lưu thất bại!";
    if (progressFill) {
      progressFill.classList.add("error");
    }
  } finally {
    publishBtn.disabled = false;
    publishBtn.innerHTML = '<span class="material-icons" style="font-size:18px;vertical-align:middle;margin-right:4px;">cloud_upload</span> Lưu video';
  }
}

/**
 * Reset form upload về trạng thái ban đầu
 */
function resetUploadForm() {
  const uploadArea = document.getElementById('upload-area');
  const videoFile = document.getElementById('video-file');
  document.getElementById('video-title').value = '';
  document.getElementById('video-description').value = '';
  uploadArea.querySelector("p").textContent = "Kéo thả video vào đây hoặc nhấp để chọn";
  uploadArea.querySelector("small").textContent = "MP4, WebM hoặc Ogg · Không giới hạn dung lượng";
  uploadArea.querySelector(".local-video-preview")?.remove();
  if (videoFile) videoFile.value = "";
  uploadArea.classList.remove("has-file");
  document.getElementById("upload-status").textContent = "";
  const progressContainer = document.getElementById("upload-progress-container");
  if (progressContainer) progressContainer.style.display = "none";
  const progressFill = document.getElementById("upload-progress-fill");
  if (progressFill) {
    progressFill.style.width = "0%";
    progressFill.classList.remove("success", "error");
  }
  selectedLocalVideo = null;
}

/**
 * Load video đã lưu trên thiết bị vào trang "Video của tôi".
 */
async function loadMyVideos() {
  const container = document.getElementById("my-videos-content");
  if (!container) return;

  try {
    const videos = await getLocalVideos();
    container.innerHTML = "";
    if (videos.length === 0) {
      container.innerHTML = `
        <p class="empty-state">
          📹 Chưa có video nào được lưu.<br>
          Hãy vào <strong>"Tạo Video"</strong> để bắt đầu!
        </p>
      `;
      return;
    }

    for (const video of videos) {
      await renderLocalVideo(video, container);
    }
  } catch (error) {
    console.error("Load local videos error:", error);
    container.innerHTML = `
      <p class="empty-state">
        ❌ Không thể tải video trên thiết bị.<br>
        <small>${escapeHtml(error.message)}</small><br><br>
        <button onclick="loadMyVideos()" class="btn-secondary">Thử lại</button>
      </p>
    `;
  }
}

// ==========================================
// INDEXEDDB LOCAL VIDEO FUNCTIONS
// ==========================================

function openLocalVideoDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_VIDEO_DB, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LOCAL_VIDEO_STORE)) {
        request.result.createObjectStore(LOCAL_VIDEO_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveLocalVideo(video) {
  const db = await openLocalVideoDb();
  await new Promise((resolve, reject) => {
    const request = db.transaction(LOCAL_VIDEO_STORE, "readwrite")
      .objectStore(LOCAL_VIDEO_STORE).put(video);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
  db.close();
}

async function getLocalVideos() {
  const db = await openLocalVideoDb();
  const videos = await new Promise((resolve, reject) => {
    const request = db.transaction(LOCAL_VIDEO_STORE).objectStore(LOCAL_VIDEO_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return videos;
}

async function deleteLocalVideo(id) {
  const db = await openLocalVideoDb();
  await new Promise((resolve, reject) => {
    const request = db.transaction(LOCAL_VIDEO_STORE, "readwrite")
      .objectStore(LOCAL_VIDEO_STORE).delete(id);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
  db.close();
}

function setupLocalVideoActions() {
  document.addEventListener("click", async (event) => {
    const playButton = event.target.closest(".local-video-play");
    if (playButton) {
      const card = playButton.closest(".local-video-card");
      const video = card?.querySelector("video");
      if (card && video) {
        openWatchPage({
          id: card.dataset.localVideoId,
          title: card.querySelector(".video-title")?.textContent || "Video",
          meta: "Video trên thiết bị",
          embedUrl: video.src,
        });
      }
      return;
    }

    const deleteButton = event.target.closest(".local-video-delete");
    if (!deleteButton) return;

    const card = deleteButton.closest(".local-video-card");
    const id = card?.dataset.localVideoId;
    if (!card || !id) return;
    if (!confirm("Xóa video này khỏi thiết bị?")) return;

    try {
      await deleteLocalVideo(id);
      const video = card.querySelector("video");
      if (video?.src.startsWith("blob:")) URL.revokeObjectURL(video.src);
      document
        .querySelectorAll(`[data-local-video-id="${CSS.escape(id)}"]`)
        .forEach((videoCard) => {
          const video = videoCard.querySelector("video");
          if (video?.src.startsWith("blob:")) URL.revokeObjectURL(video.src);
          videoCard.remove();
        });
    } catch (error) {
      console.error("Unable to delete local video:", error);
      alert("Không thể xóa video. Vui lòng thử lại.");
    }
  });
}

async function loadLocalVideos() {
  try {
    const videos = await getLocalVideos();
    for (const video of videos) await renderLocalVideo(video);
  } catch (error) {
    console.warn("Offline video storage is unavailable:", error);
  }
}

async function renderLocalVideo(video, container) {
  const grid = container || document.querySelector("#view-home .video-grid");
  if (!grid || grid.querySelector(`[data-local-video-id="${video.id}"]`)) return;
  const url = URL.createObjectURL(video.blob);
  const card = document.createElement("article");
  card.className = "video-card local-video-card";
  card.dataset.localVideoId = video.id;
  card.innerHTML = `
    <div class="video-thumbnail">
      <video data-video-id="${video.id}" src="${url}" controls playsinline preload="metadata"></video>
    </div>
    <div class="video-info">
      <h3 class="video-title">${escapeHtml(video.title)}</h3>
      <p class="video-meta">Video trên thiết bị · Xem offline</p>
      <div class="local-video-actions">
        <button type="button" class="btn-secondary local-video-play">
          <span class="material-icons">play_arrow</span> Xem
        </button>
        <button type="button" class="btn-secondary local-video-delete">
          <span class="material-icons">delete</span> Xóa
        </button>
      </div>
    </div>
  `;
  grid.prepend(card);
}

// Account Functions
function showRegister() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('register-section').style.display = 'block';
}

function showLogin() {
  document.getElementById('register-section').style.display = 'none';
  document.getElementById('login-section').style.display = 'block';
}

function initAccount() {
  // Social login buttons
  const googleBtn = document.querySelector('.btn-google');
  const facebookBtn = document.querySelector('.btn-facebook');

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      alert('Đăng nhập bằng Google - Tính năng sẽ sớm ra mắt!');
    });
  }

  if (facebookBtn) {
    facebookBtn.addEventListener('click', () => {
      alert('Đăng nhập bằng Facebook - Tính năng sẽ sớm ra mắt!');
    });
  }

  // Form submissions
  const loginForm = document.querySelector('#login-section .auth-form');
  const registerForm = document.querySelector('#register-section .auth-form');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const phone = e.target.querySelector('input[type="tel"]').value;
      const email = e.target.querySelector('input[type="email"]').value;

      if (phone && email) {
        alert('Đăng nhập thành công!');
      } else {
        alert('Vui lòng nhập đầy đủ thông tin!');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = e.target.querySelector('input[type="text"]').value;
      const phone = e.target.querySelector('input[type="tel"]').value;
      const email = e.target.querySelector('input[type="email"]').value;
      const password = e.target.querySelectorAll('input[type="password"]')[0].value;
      const confirmPassword = e.target.querySelectorAll('input[type="password"]')[1].value;

      if (name && phone && email && password && confirmPassword) {
        if (password === confirmPassword) {
          alert('Đăng ký thành công!');
          showLogin();
        } else {
          alert('Mật khẩu xác nhận không khớp!');
        }
      } else {
        alert('Vui lòng nhập đầy đủ thông tin!');
      }
    });
  }
}

// Initialize new features
document.addEventListener("DOMContentLoaded", () => {
  initCreateVideo();
  initAccount();
});
