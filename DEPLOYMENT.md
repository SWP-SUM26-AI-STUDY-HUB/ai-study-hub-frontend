# Hướng dẫn sử dụng — AI Study Hub Frontend

> Dành cho dev FE. Đọc 2 mục đầu trước khi code / pull code mới.

---

## 1. Chạy local

```bash
npm install
npm run dev      # mở http://localhost:5173
```

### Tạo file `.env` (BẮT BUỘC để gọi được backend)

Copy từ file mẫu rồi chạy:

```bash
cp .env.example .env
```

File `.env.example` đã set sẵn trỏ thẳng vào backend trên VPS:

```bash
VITE_API_BASE_URL=http://14.225.254.145:8080
```

- Mặc định trỏ vào backend trên VPS (`http://14.225.254.145:8080`).
- Nếu chạy backend ở máy mình → đổi thành `http://localhost:8080`.

> File `.env` đã được **gitignore** → KHÔNG commit lên repo, mỗi máy tự tạo 1 bản.

---

## 2. Quy tắc gọi API — KHÔNG hardcode URL

Khi viết lời gọi API mới, **luôn import và dùng `API_BASE_URL`**:

```jsx
import { API_BASE_URL } from '../../api.js';

// ✅ ĐÚNG
const res = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
  headers: { Authorization: `Bearer ${token}` },
});

// ❌ SAI — sẽ hỏng khi đổi môi trường
const res = await fetch('http://14.225.254.145:8080/api/v1/users/profile', { ... });
```

`API_BASE_URL` lấy giá trị từ file `.env` (local). Đường dẫn import theo độ sâu
thư mục:

| Vị trí file gọi | Import |
|---|---|
| `src/app/context/*.jsx` | `'../api.js'` |
| `src/app/components/**`, `src/app/pages/**` | `'../../api.js'` |

Toàn bộ code cũ đã được sửa sang dạng này rồi — chỉ cần áp dụng cho code mới.

---