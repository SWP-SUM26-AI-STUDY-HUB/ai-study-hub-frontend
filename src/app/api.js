// Base URL cho mọi lời gọi API.
//
// Lấy từ biến môi trường VITE_API_BASE_URL (xem .env.example).
//   - Local dev: tạo file .env với VITE_API_BASE_URL = URL backend bạn trỏ tới
//     (vd http://14.225.254.145:8080 hoặc http://localhost:8080).
//   - Production: bỏ trống (không cần .env) — nginx proxy lo việc forward /api.
//
// QUAN TRỌNG: luôn dùng hằng số này khi gọi API, KHÔNG hardcode URL backend.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
