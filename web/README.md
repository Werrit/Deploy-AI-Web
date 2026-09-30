# AI Showcase

Giao diện tiếng Việt cho 5 trang: Trang chủ, Phân loại hoa (ResNet-18), Phát hiện vật thể (YOLO11n), Truy hồi ảnh (CLIP ViT) và Chatbot RAG. Dùng HTML, CSS và JavaScript thuần, không cần npm hay chạy mô hình.

Từ thư mục gốc của dự án:

```bash
python3 -m http.server 8080 --bind 127.0.0.1 --directory web
```

Mở <http://localhost:8080>. Các trang có đường dẫn riêng bằng hash: `#home`, `#flowers`, `#detection`, `#retrieval`, `#chat`. Liên kết giới thiệu nhóm là `#home/about`.

## Nội dung và dữ liệu mẫu

Sửa các phần `[Tên nhóm]`, `[Môn học / lớp]`, thành viên, phân công và cách sử dụng AI trong `index.html`. Không có thông tin cá nhân hay đóng góp nào được tự tạo.

Nhãn, độ tin cậy, khung giới hạn, điểm tương đồng và câu trả lời trong `app.js` đều là dữ liệu minh họa có nhãn rõ ràng. Danh sách lớp chưa đại diện cho tập huấn luyện thực tế của nhóm. Không có suy luận AI, tìm kiếm ngữ nghĩa hoặc gọi API. Khi chọn ảnh riêng, giao diện chỉ xem trước ảnh và không hiển thị dự đoán giả. Ảnh không được gửi lên máy chủ; dữ liệu giao diện chỉ tồn tại trong phiên trình duyệt.

Các đoạn nguồn chat lấy từ `data/kb/doi_tra.md`, `giao_hang.md` và `thanh_toan.md` của dự án. Chọn câu hỏi gợi ý để xem mẫu. Câu hỏi tự do hiển thị thông báo về giới hạn của bản minh họa.

## Thiết kế

Portfolio sáng tạo với nền giấy, điểm nhấn đỏ đất, khoảng trống rộng và bộ ảnh lớn. CSS tự chuyển toàn bộ giao diện theo chế độ sáng/tối của hệ thống, hỗ trợ giảm chuyển động và bàn phím. Trang chủ có bố cục một cột dưới 768px; các trang mô hình dùng bố cục riêng cho ảnh, kết quả và nguồn.

Hướng dẫn sử dụng: [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), `design-taste-frontend` cho trang chủ, và `frontend-ui-engineering` cho khả năng truy cập và các trang mô hình. Độ biến tấu 8, chuyển động 4, mật độ 3. Đây là thiết kế CSS riêng, không phải triển khai một hệ thống giao diện thương hiệu.

## Kiểm tra

`check.cjs` sử dụng Playwright và Chromium đã cài. Chạy khi máy chủ xem trước đang mở:

```bash
node web/check.cjs
```

Nếu Playwright nằm ngoài `node_modules`, đặt `PLAYWRIGHT_MODULE` tới đường dẫn module. Có thể đặt `CHROMIUM_PATH` tới trình duyệt Chromium và `SCREENSHOT_DIR` để lưu ảnh chụp. Bộ kiểm tra bao gồm năm trang, bốn kích thước 320/768/1024/1440px, hai chế độ màu, tệp lỗi, ảnh tự chọn, bộ lọc khung, hộp thoại ảnh, nguồn chat và kiểm tra không gọi API.

## Tài nguyên

Phông [Be Vietnam Pro](https://github.com/google/fonts/tree/main/ofl/bevietnampro) được lưu cục bộ, giấy phép trong `assets/be-vietnam-license.txt`. Biểu tượng từ [Tabler Icons](https://github.com/tabler/tabler-icons), giấy phép trong `assets/tabler-license.txt`. Tài nguyên được lưu trong `assets/` để trình bày không phụ thuộc CDN.

| Tệp ảnh | Nguồn |
| --- | --- |
| `hero.webp` | Tạo riêng bằng công cụ imagegen tích hợp; lưu trong thư mục dự án |
| `flowers.webp` | [Unsplash](https://images.unsplash.com/photo-1490750967868-88aa4486c946) |
| `rose.webp` | [Unsplash](https://images.unsplash.com/photo-1457089328109-e5d9bd499191) |
| `mountain.webp` | [Unsplash](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b) |
| `forest.webp` | [Unsplash](https://images.unsplash.com/photo-1441974231531-c6227db76b6e) |
| `lake.webp` | [Unsplash](https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1) |
| `desert.webp` | [Unsplash](https://images.unsplash.com/photo-1509316785289-025f5b846b35) |
| `objects.webp` | [Ảnh ví dụ trong Darknet](https://github.com/pjreddie/darknet/blob/master/data/dog.jpg) |

Prompt tạo ảnh `assets/hero.webp` (công cụ tích hợp, không dùng CLI):

> Use case: photorealistic-natural. Asset type: homepage hero photograph for a warm creative Vietnamese student AI project showcase. Create a refined editorial still life: one vivid coral-orange gerbera flower with stem in a simple matte terracotta vase, a small orderly stack of blank photographic prints showing a forest and mountain landscape, and a quiet folded cream sheet of paper on a muted pale sage studio tabletop. These objects represent flower classification, visual search, and knowledge. Photographic realism, soft late afternoon directional sunlight, tactile paper, natural shadows, restrained warm palette of sage, coral and ivory. Portrait composition approximately 4:5, objects framed as a coherent art-directed still life with generous clean space around them. No people, no text, no letters, no numbers, no logos, no artificial UI, no interface overlays, no gradients, no watermark.
