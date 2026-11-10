# Janaka Video — Nền tảng khám phá video học lập trình

Janaka Video là ứng dụng web tiếng Việt giúp người học khám phá và xem video về lập trình, công nghệ và các chủ đề liên quan. Dự án kết hợp giao diện responsive, trình phát video nhúng, tìm kiếm YouTube và một backend Node.js để tích hợp YouTube Data API, Gemini AI, tài khoản người dùng và thư viện video.

> **Lưu ý:** Janaka Video là dự án độc lập, không liên kết hoặc được YouTube, Google hay Gemini bảo trợ. Nội dung video được cung cấp bởi YouTube; trải nghiệm quảng cáo phụ thuộc vào YouTube và từng video.

[![Mở mã nguồn Janaka Video](https://img.shields.io/badge/GitHub-Janaka%20Video-181717?logo=github)](https://github.com/vietanhnguyenkhac29-tech/Janaka_The-Youtube-app-clone)
Results:(https://vietanhnguyenkhac29-tech.github.io/Janaka_The-Youtube-app-clone/)

## Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng](#tính-năng)
- [Công nghệ](#công-nghệ)
- [Kiến trúc dự án](#kiến-trúc-dự-án)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt và chạy local](#cài-đặt-và-chạy-local)
- [Cấu hình biến môi trường](#cấu-hình-biến-môi-trường)
- [API backend](#api-backend)
- [Xuất bản với GitHub Pages](#xuất-bản-với-github-pages)
- [SEO và khả năng truy cập](#seo-và-khả-năng-truy-cập)
- [Bảo mật và quyền riêng tư](#bảo-mật-và-quyền-riêng-tư)
- [Đóng góp](#đóng-góp)
- [Giấy phép](#giấy-phép)

## Tổng quan

Janaka Video được xây dựng để thực hành và trình diễn phát triển ứng dụng web với HTML, CSS, JavaScript và Node.js. Giao diện tập trung vào việc duyệt nội dung học lập trình, tìm video theo từ khóa hoặc danh mục, và lưu một số dữ liệu trải nghiệm trên trình duyệt.

Ứng dụng gồm hai phần:

1. **Frontend tĩnh:** HTML, CSS và JavaScript thuần; có thể chạy bằng máy chủ web tĩnh.
2. **Backend API:** Node.js và Express; kết nối MongoDB, YouTube Data API và Gemini API.

Frontend hiện gọi backend tại `http://localhost:5000`. Vì vậy, chỉ xuất bản frontend trên GitHub Pages **không** làm cho các API YouTube, Gemini, đăng nhập hoặc thư viện video hoạt động trực tuyến. Muốn dùng các tính năng này trên website đã xuất bản, cần triển khai backend riêng, đặt biến môi trường an toàn và cấu hình URL/CORS phù hợp.

## Tính năng

- Giao diện xem video responsive, thiết kế theo hướng ưu tiên trải nghiệm trên máy tính và thiết bị di động.
- Tìm kiếm video và khám phá nội dung phổ biến hoặc theo danh mục thông qua backend tích hợp YouTube Data API.
- Trình phát YouTube nhúng; hỗ trợ tải iframe trì hoãn để giảm tải ban đầu.
- Sidebar, điều hướng danh mục và tương tác giao diện bằng JavaScript.
- Lưu một số trạng thái và dữ liệu cá nhân hóa trong `localStorage` của trình duyệt.
- Các endpoint backend cho đăng ký, đăng nhập, video và trao đổi với Gemini AI.
- Web app manifest và service worker cho các khả năng PWA cơ bản.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Express |
| Cơ sở dữ liệu | MongoDB và Mongoose |
| Xác thực | JSON Web Token (JWT), bcrypt |
| Dịch vụ nội dung | YouTube Data API v3 |
| AI | Gemini API |
| Lưu trữ video backend | Multer và hệ thống tệp của máy chủ |
| Ứng dụng web | Web App Manifest, Service Worker |

## Kiến trúc dự án

```text
.
├── index.html                 # Trang web chính
├── style.css                  # Giao diện và responsive layout
├── index.js                   # Tương tác giao diện và trạng thái ứng dụng
├── youtube-api.js             # Client gọi YouTube API qua backend
├── videos-data.js             # Dữ liệu/cấu hình video phía frontend
├── mobile/
│   ├── manifest.json          # Metadata cài đặt PWA
│   ├── pwa.js                 # Đăng ký service worker
│   └── sw.js                  # Cache/offline cơ bản
├── server/
│   ├── config/                # Kết nối MongoDB
│   ├── controllers/           # Xử lý nghiệp vụ API
│   ├── middleware/            # Middleware xác thực
│   ├── models/                # Mô hình dữ liệu MongoDB
│   ├── routes/                # Các tuyến API Express
│   ├── server.js              # Điểm khởi chạy backend
│   └── package.json           # Dependencies và scripts backend
└── .github/workflows/
    └── pages.yml              # Workflow xuất bản GitHub Pages
```

## Yêu cầu hệ thống

- Node.js và npm để chạy backend.
- MongoDB (local hoặc dịch vụ MongoDB có thể truy cập từ backend).
- API key YouTube Data API v3 nếu muốn tìm kiếm/tải dữ liệu YouTube.
- Gemini API key nếu muốn sử dụng endpoint AI.
- VS Code Live Server hoặc một máy chủ web tĩnh để chạy frontend.

## Cài đặt và chạy local

### 1. Tải mã nguồn

```bash
git clone https://github.com/vietanhnguyenkhac29-tech/Janaka_The-Youtube-app-clone.git
cd Janaka_The-Youtube-app-clone
```

### 2. Cấu hình và khởi động backend

```bash
cd server
npm install
```

Tạo file `server/.env` theo mẫu trong phần [Cấu hình biến môi trường](#cấu-hình-biến-môi-trường), sau đó chạy:

```bash
npm run dev
```

Backend mặc định chạy tại `http://localhost:5000`. Có thể kiểm tra máy chủ tại `http://localhost:5000/`.

### 3. Khởi động frontend

Mở thư mục gốc bằng VS Code, khởi chạy **Live Server** từ `index.html`, rồi truy cập địa chỉ local mà Live Server cung cấp (thường là `http://127.0.0.1:5500`).

Không nên mở trực tiếp `index.html` bằng giao thức `file://`: các module JavaScript và service worker cần được phục vụ qua HTTP hoặc HTTPS.

## Cấu hình biến môi trường

Tạo `server/.env` trên máy của bạn và điền giá trị phù hợp. Không commit file này hoặc đưa API key, JWT secret hay thông tin kết nối cơ sở dữ liệu vào mã nguồn.

```dotenv
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/janaka_video
JWT_SECRET=replace-with-a-long-random-secret
YOUTUBE_API_KEY=your-youtube-data-api-key
GEMINI_API_KEY=your-gemini-api-key
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

`ALLOWED_ORIGINS` là danh sách origin được backend cho phép, phân cách bằng dấu phẩy. Khi triển khai frontend và backend, hãy thay bằng origin HTTPS thực tế của frontend. Tệp `server/.env` được loại trừ khỏi Git bằng `.gitignore`.

## API backend

Base URL local: `http://localhost:5000`.

| Phương thức | Endpoint | Mô tả |
| --- | --- | --- |
| `GET` | `/api/youtube/trending` | Video phổ biến theo khu vực |
| `GET` | `/api/youtube/search?q=<từ-khóa>` | Tìm video YouTube |
| `GET` | `/api/youtube/category?categoryId=<id>` | Video theo danh mục YouTube |
| `GET` | `/api/youtube/details?id=<id>` | Chi tiết một hoặc nhiều video |
| `POST` | `/api/auth/register` | Tạo tài khoản |
| `POST` | `/api/auth/login` | Đăng nhập và nhận JWT |
| `GET` | `/api/auth/me` | Lấy thông tin tài khoản; cần JWT |
| `POST` | `/api/gemini/chat` | Gửi prompt đến Gemini; cần JWT |
| `GET` | `/api/videos?page=1&limit=20` | Danh sách video đã lưu |
| `GET` | `/api/videos/:id` | Chi tiết video đã lưu |
| `POST` | `/api/videos/upload` | Tải video lên backend |
| `DELETE` | `/api/videos/:id` | Xóa video đã lưu |

Các API YouTube và Gemini yêu cầu khóa tương ứng được cấu hình ở backend. Khi triển khai công khai, hãy xem xét xác thực và giới hạn quyền truy cập cho các thao tác dữ liệu trước khi cung cấp dịch vụ cho người dùng.

## Xuất bản với GitHub Pages

Workflow tại `.github/workflows/pages.yml` triển khai nội dung tĩnh từ nhánh `main` mỗi khi có thay đổi. Để bật xuất bản cho repository:

1. Mở **Settings → Pages** trên GitHub.
2. Trong **Build and deployment**, chọn **GitHub Actions** làm nguồn triển khai.
3. Mở tab **Actions** và xác nhận workflow **Deploy static site to GitHub Pages** chạy thành công.

Đường dẫn Pages dự kiến: <https://vietanhnguyenkhac29-tech.github.io/Janaka_The-Youtube-app-clone/>.

GitHub Pages chỉ phục vụ frontend tĩnh, không chạy Node.js hoặc MongoDB. Frontend hiện cấu hình gọi backend local; cần cập nhật URL API trong frontend và cấu hình CORS của backend trước khi dùng các tính năng cần API trên website công khai.

## SEO và khả năng truy cập

Trang chính khai báo ngôn ngữ tiếng Việt, tiêu đề và mô tả trang, Open Graph, Twitter Cards, favicon, viewport responsive và màu giao diện. Nội dung README cũng mô tả rõ chủ đề **học lập trình qua video**, video hướng dẫn, công nghệ web và các tính năng chính để người dùng, cộng tác viên và công cụ tìm kiếm hiểu phạm vi dự án.

> README và metadata là nền tảng SEO on-page; chúng không đảm bảo thứ hạng tìm kiếm. Khả năng được lập chỉ mục còn tùy thuộc vào trạng thái xuất bản HTTPS, nội dung có thể truy cập, liên kết nội bộ và chính sách của công cụ tìm kiếm.

## Bảo mật và quyền riêng tư

- API key và bí mật xác thực chỉ được cấu hình trong biến môi trường backend; không đặt bí mật trong frontend.
- Không commit `server/.env`, JWT secret, API key, dữ liệu người dùng hoặc video tải lên.
- Dữ liệu lưu bằng `localStorage` nằm trên trình duyệt của từng người dùng.
- Website tải nội dung từ các dịch vụ bên ngoài như YouTube, Google Fonts và Gemini; hành vi dữ liệu của các dịch vụ này tuân theo chính sách riêng của nhà cung cấp.
- Trước khi triển khai cho người dùng thật, cần cấu hình HTTPS, origin CORS chính xác, kiểm soát quyền truy cập API và quy trình lưu trữ dữ liệu phù hợp.

## Đóng góp

1. Tạo fork hoặc nhánh riêng cho thay đổi.
2. Giữ thay đổi tập trung, không thêm secrets hoặc file cấu hình cá nhân.
3. Kiểm tra frontend local và backend/API liên quan trước khi mở pull request.
4. Mô tả rõ thay đổi, cách kiểm thử và các cấu hình cần thiết.

## Giấy phép

Repository hiện chưa khai báo tệp giấy phép. Hãy liên hệ chủ dự án trước khi tái sử dụng, phân phối hoặc khai thác mã nguồn ngoài phạm vi được cho phép.

---

**Janaka Video** · Dự án web học tập và khám phá video lập trình.
