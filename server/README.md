# Janaka Video Backend Server

Đây là backend server cho dự án Janaka Video, đảm nhiệm việc bảo mật API Key và xác thực người dùng.

## 1. Cài đặt

1.  Mở terminal tại thư mục `server`:
    ```bash
    cd d:\Vanhleg\Vanhleg_code\Newbie-Code-main\Newbie-Code-main\server
    ```
2.  Cài đặt các thư viện:
    ```bash
    npm install
    ```

## 2. Cấu hình

1.  Mở file `.env` trong thư mục `server`.
2.  Điền các thông tin sau:
    - `MONGO_URI`: Chuỗi kết nối MongoDB (ví dụ: `mongodb://localhost:27017/janaka_video`)
    - `YOUTUBE_API_KEY`: API Key lấy từ Google Cloud Console (bật YouTube Data API v3).
    - `GEMINI_API_KEY`: API Key lấy từ Google AI Studio.

## 3. Chạy Server

- Chạy chế độ development (tự restart khi sửa code):
  ```bash
  npm run dev
  ```
- Server sẽ chạy tại: `http://localhost:5000`

## 4. Kiểm tra

- API YouTube: `http://localhost:5000/api/youtube/trending`
- API Gemini: `POST http://localhost:5000/api/gemini/chat` (Body: `{ "prompt": "Hello" }`)
