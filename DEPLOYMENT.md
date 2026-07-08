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

## 3. Deploy production lên VPS (domain `aistudyhub.io.vn`)

Kiến trúc: **host nginx** trên VPS (chấm dứt SSL) → proxy sang **frontend container**
(bind `127.0.0.1:8081:80`) → container nginx serve SPA + forward `/api` sang backend
container (`ai-study-hub-api:8080`) qua Docker network.

> Yêu cầu trước: domain `aistudyhub.io.vn` (và `www`) đã có A record trỏ về IP VPS,
> `ping aistudyhub.io.vn` ra đúng IP, firewall mở port **80 + 443**.

### 3.1. Cài đặt trên VPS (một lần)

```bash
# Ubuntu/Debian — chỉ cài nginx. certbot chạy bằng Docker image (cô lập,
# tránh lỗi `GEN_EMAIL` do xung đột cryptography/pyopenssl khi cài apt certbot
# trên Ubuntu 22.04). Chỉ khi muốn email nhận thông báo hết hạn mới thêm `-m`.
sudo apt update
sudo apt install -y nginx
sudo mkdir -p /var/www/certbot          # webroot cho Let's Encrypt
```

### 3.2. Chạy frontend container (bind loopback)

```bash
cd /path/to/ai-study-hub-frontend
docker compose up -d --build
# Verify container chỉ nghe ở localhost, KHÔNG lộ ra Internet:
docker ps                                   # -> 127.0.0.1:8081->80/tcp
curl -I http://127.0.0.1:8081              # -> 200 OK (SPA)
```

### 3.3. Cấp SSL (bootstrap — làm 1 lần)

Config cuối tham chiếu tới file cert nên **phải cấp cert trước khi enable block 443**.
Dùng webroot để không phải dừng nginx:

```bash
# Bước A: tạo 1 server block HTTP tạm CHỈ để serve acme-challenge
sudo tee /etc/nginx/sites-available/aistudyhub.io.vn.conf >/dev/null <<'EOF'
server {
    listen 80;
    server_name aistudyhub.io.vn www.aistudyhub.io.vn;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 444; }
}
EOF
sudo ln -sf /etc/nginx/sites-available/aistudyhub.io.vn.conf \
            /etc/nginx/sites-enabled/aistudyhub.io.vn.conf
sudo nginx -t && sudo systemctl reload nginx

# Bước B: cấp cert cho cả root + www qua certbot Docker image (cần 2 tên đều có A record)
sudo docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt -v /var/www/certbot:/var/www/certbot \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d aistudyhub.io.vn -d www.aistudyhub.io.vn \
    --agree-tos --register-unsafely-without-email -n
#  Đổi `--register-unsafely-without-email` thành `-m you@email.com` nếu muốn
#  nhận mail hết hạn. Cert sinh tại /etc/letsencrypt/live/aistudyhub.io.vn/
```

> Nếu chưa trỏ DNS cho `www`: bỏ `-d www.aistudyhub.io.vn` và xóa block www
> trong config ở mục 3.4 (www redirect sẽ không hoạt động đến khi thêm A record).

### 3.4. Enable config production (đầy đủ)

```bash
# Đè config tạm bằng file chính thức trong repo
sudo cp deploy/nginx/aistudyhub.io.vn.conf \
            /etc/nginx/sites-available/aistudyhub.io.vn.conf
sudo nginx -t && sudo systemctl reload nginx
```

Kiểm tra:

```bash
curl -I https://aistudyhub.io.vn               # -> 200
curl -I http://aistudyhub.io.vn                # -> 301 -> https
curl -I https://www.aistudyhub.io.vn           # -> 301 -> https://aistudyhub.io.vn
```

### 3.5. Auto-renew SSL

Certbot chạy bằng Docker image nên cần cron tự gia hạn (đã setup sẵn trên VPS):

- `/usr/local/bin/certbot-renew.sh` — chạy `certbot renew` (docker) + `systemctl reload nginx`
- `/etc/cron.d/certbot-renew` — chạy daily 03:07

Webroot renewal dùng đúng `location /.well-known/acme-challenge/` đã có trong config
production. Test thủ công (đổi `--register-unsafely-without-email` nếu đã set email):

```bash
sudo docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/www/certbot:/var/www/certbot \
    certbot/certbot renew --dry-run --no-random-sleep-on-renew
```
(`--no-random-sleep-on-renew` chỉ để test nhanh; cron để sleep random mặc định.)

### 3.6. Deploy lại khi có code mới

VPS deploy bằng rsync (chưa có git repo trên VPS). Từ máy dev:

```bash
rsync -az --delete \
  --exclude node_modules --exclude dist --exclude .git \
  --exclude .env --exclude '.env.*' \
  ~/code/ai-study-hub-frontend/ vps:/root/ai-study-hub-frontend/
ssh vps 'cd /root/ai-study-hub-frontend && docker compose up -d --build'
# host nginx + SSL không cần đụng khi redeploy
```
