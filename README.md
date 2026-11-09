📺 Janaka Video - Trang Web Xem Video Trực Tuyến
📝 Giới thiệu

Janaka Video là một dự án luyện tập Front-end cơ bản nhằm xây dựng giao diện người dùng (UI) mô phỏng nền tảng YouTube. Dự án giúp thực hành kỹ năng xây dựng bố cục trang web hiện đại, xử lý giao diện đáp ứng (Responsive) và tương tác người dùng thông qua JavaScript.

✨ Các tính năng chính

Header cố định: Thanh công cụ phía trên luôn hiển thị giúp tìm kiếm và truy cập nhanh các tính năng như tạo video, thông báo và tài khoản.


Sidebar linh hoạt: Hệ thống menu bên trái hỗ trợ điều hướng qua các mục như Trang chủ, Khám phá, Kênh đăng ký, và Danh sách phát. Menu này có thể đóng/mở mượt mà thông qua nút bấm Toggle.


Thanh danh mục (Category Nav): Cho phép người dùng nhanh chóng lọc video theo các chủ đề như Âm nhạc, Trò chơi, Công nghệ, và Giáo dục.

Lưới video Responsive: Hiển thị danh sách video theo dạng lưới (Grid), tự động điều chỉnh số lượng cột phù hợp với kích thước màn hình.


Trình phát Video: Nhúng trực tiếp video từ YouTube với tỉ lệ khung hình 16:9 chuẩn.

🛠 Công nghệ sử dụng

HTML5: Cấu trúc nội dung và các thẻ ngữ nghĩa.

CSS3:

Flexbox & Grid: Quản lý bố cục phức tạp và dàn hàng các video.

Webkit Scrollbar: Tùy chỉnh thanh cuộn cho thanh danh mục và sidebar.

Transitions: Tạo hiệu ứng trượt mượt mà khi mở Sidebar.

JavaScript (ES6):

DOM Manipulation: Lắng nghe sự kiện click và thay đổi Class CSS để tương tác với giao diện.

Modules: Quản lý dữ liệu cấu hình video thông qua việc xuất/nhập hằng số.


Google Material Icons: Hệ thống biểu tượng trực quan cho các nút điều hướng.

📂 Cấu trúc dự án

Index.html: Chứa cấu trúc xương sống của trang web.

style.css: Định nghĩa toàn bộ phong cách, màu sắc và bố cục.

index.js: Xử lý logic đóng/mở Sidebar.

videos-data.js: Lưu trữ các hằng số về chất lượng video, độ phân giải và tỉ lệ khung hình.

.gitignore: Loại bỏ các file rác từ trình soạn thảo (VS Code, IntelliJ) khi đẩy lên GitHub.

🚀 Hướng dẫn khởi chạy
Tải toàn bộ thư mục Newbie luyện code về máy.

Mở tệp Index.html bằng trình duyệt web bất kỳ.

Để có trải nghiệm tốt nhất (đặc biệt khi sử dụng JavaScript Module), bạn nên sử dụng tiện ích Live Server trên VS Code.

## GitHub Pages

Trang tĩnh có thể được xuất bản từ GitHub Actions sau khi đẩy lên nhánh `main`. GitHub Pages chỉ lưu trữ frontend; các chức năng cần backend (YouTube API, AI và xác thực) vẫn cần một backend được triển khai riêng và cấu hình URL tương ứng. Không đưa `server/.env` lên GitHub.

🤝 Thông tin tác giả
Dự án: Janaka Video

Thực hiện bởi: Newbie luyện code



Năm: 2024 - 2025
