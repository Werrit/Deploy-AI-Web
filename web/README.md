# AI Showcase

Giao diện tiếng Việt cho 5 trang, dùng HTML/CSS/JavaScript thuần. Phân loại hoa và chatbot gọi API thật trên cùng server; phát hiện vật thể và truy hồi ảnh vẫn là minh họa.

Từ thư mục gốc, cài thư viện rồi chạy:

```bash
python streamlit_app.py
```

Mở <http://localhost:7860>. Không chạy riêng `http.server` để sử dụng mô hình. Các trang dùng hash: `#home`, `#flowers`, `#detection`, `#retrieval`, `#chat`; giới thiệu nhóm ở `#home/about`.

## Nội dung và dữ liệu

Điền thông tin nhóm trong `index.html`. Trang hoa gửi ảnh lên `/api/classifier/predict` khi bấm Nhận diện. Trang chat gửi câu hỏi và lịch sử tới `/api/chat`, đọc câu trả lời dạng stream và hiển thị các đoạn nguồn RAG. Nội dung trả về được hiển thị dưới dạng văn bản.

Các khung phát hiện vật thể và kết quả truy hồi trong `app.js` là dữ liệu mẫu có nhãn rõ ràng. Upload ở hai trang này chỉ xem trước; không chạy YOLO/CLIP và không hiển thị dự đoán giả cho ảnh riêng.

## Thiết kế

Portfolio sáng tạo với nền giấy, điểm nhấn đỏ đất, khoảng trống rộng và bộ ảnh lớn. CSS tự chuyển toàn bộ giao diện theo chế độ sáng/tối của hệ thống, hỗ trợ giảm chuyển động và bàn phím. Trang chủ có bố cục một cột dưới 768px; các trang mô hình dùng bố cục riêng cho ảnh, kết quả và nguồn.

Hướng dẫn sử dụng: [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), `design-taste-frontend` cho trang chủ, và `frontend-ui-engineering` cho khả năng truy cập và các trang mô hình. Độ biến tấu 8, chuyển động 4, mật độ 3. Đây là thiết kế CSS riêng, không phải triển khai một hệ thống giao diện thương hiệu.

## Kiểm tra

`check.cjs` sử dụng Playwright và Chromium đã cài. Chạy khi máy chủ xem trước đang mở:

```bash
node web/check.cjs http://127.0.0.1:7860/
```

Nếu Playwright nằm ngoài `node_modules`, đặt `PLAYWRIGHT_MODULE` tới đường dẫn module. Có thể đặt `CHROMIUM_PATH` tới trình duyệt Chromium và `SCREENSHOT_DIR` để lưu ảnh chụp. Bộ kiểm tra bao gồm năm trang, bốn kích thước 320/768/1024/1440px, hai chế độ màu, tệp lỗi, ảnh tự chọn, bộ lọc khung, hộp thoại ảnh, API hoa/chat thật, nguồn chat, lịch sử, xử lý lỗi và văn bản an toàn.

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
