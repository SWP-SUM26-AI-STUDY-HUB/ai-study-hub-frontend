// Base URL cho mọi lời gọi API.
//
// Lấy từ biến môi trường VITE_API_BASE_URL (xem .env.example).
//   - Local dev: tạo file .env với VITE_API_BASE_URL = URL backend bạn trỏ tới
//     (vd http://14.225.254.145:8080 hoặc http://localhost:8080).
//   - Production: bỏ trống (không cần .env) — nginx proxy lo việc forward /api.
//
// QUAN TRỌNG: luôn dùng hằng số này khi gọi API, KHÔNG hardcode URL backend.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

// ============================================================================
// BỘ ĐÁNH CHẶN FETCH TOÀN CỤC (GLOBAL FETCH INTERCEPTOR)
// Tự động làm mới Access Token bằng Refresh Token khi gặp lỗi 401 Unauthorized
// ============================================================================

/**
 * 1. LƯU LẠI HÀM FETCH GỐC CỦA TRÌNH DUYỆT
 * Sử dụng `.bind(window)` để khóa ngữ cảnh (context) `this` của hàm fetch luôn hướng về đối tượng `window`.
 * Nếu không sử dụng `.bind(window)`, trình duyệt sẽ báo lỗi "TypeError: Illegal invocation"
 * khi ta thực thi hàm `originalFetch` độc lập.
 */
const originalFetch = window.fetch.bind(window);

/**
 * 2. CÁC BIẾN QUẢN LÝ TRẠNG THÁI GIA HẠN TOKEN
 * - `isRefreshing`: Khóa boolean để đánh dấu xem có tiến trình refresh token nào đang chạy không.
 *                  Ngăn chặn việc gửi nhiều yêu cầu /refresh song song khi nhiều API đồng thời lỗi 401.
 * - `refreshSubscribers`: Mảng chứa danh sách các hàm callback (hàng đợi) chờ được thực thi lại
 *                        sau khi lấy được Access Token mới thành công.
 */
let isRefreshing = false;
let refreshSubscribers = [];

// Đăng ký một request bị lỗi vào hàng đợi chờ token mới
function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

// Chạy lại toàn bộ các request đang chờ trong hàng đợi khi đã có token mới
function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * 3. HÀM CẬP NHẬT HEADER AUTHORIZATION VỚI TOKEN MỚI
 * Hàm này có nhiệm vụ chèn hoặc cập nhật header 'Authorization': 'Bearer <token>' vào cấu hình request.
 * Nó hỗ trợ xử lý linh hoạt cho 3 cấu trúc đầu vào khác nhau:
 * - Khi không có config (GET mặc định).
 * - Khi header là một đối tượng `Headers` chuẩn của trình duyệt.
 * - Khi header là một Object JS bình thường (phổ biến trong dự án).
 */
function updateAuthHeader(config, newToken) {
  if (!config) {
    return {
      headers: {
        'Authorization': `Bearer ${newToken}`
      }
    };
  }

  const newConfig = { ...config };

  // TH1: Headers là instance của class Headers trình duyệt
  if (newConfig.headers instanceof Headers) {
    const newHeaders = new Headers(newConfig.headers);
    newHeaders.set('Authorization', `Bearer ${newToken}`);
    newConfig.headers = newHeaders;
  } 
  // TH2: Headers là một Object Javascript bình thường
  else if (newConfig.headers && typeof newConfig.headers === 'object') {
    // Xoá tất cả biến thể viết hoa/thường của Authorization (như 'authorization' hoặc 'Authorization') 
    // để tránh gửi trùng lặp 2 headers cùng lúc khiến Server từ chối xử lý.
    const cleanedHeaders = {};
    for (const key of Object.keys(newConfig.headers)) {
      if (key.toLowerCase() !== 'authorization') {
        cleanedHeaders[key] = newConfig.headers[key];
      }
    }
    newConfig.headers = {
      ...cleanedHeaders,
      'Authorization': `Bearer ${newToken}`
    };
  } 
  // TH3: Request gốc chưa định nghĩa trường headers
  else {
    newConfig.headers = {
      'Authorization': `Bearer ${newToken}`
    };
  }
  return newConfig;
}

/**
 * 4. GHI ĐÈ HÀM FETCH TOÀN CỤC CỦA TRÌNH DUYỆT (MONKEY-PATCHING)
 * Hàm này sẽ can thiệp vào tất cả mọi cuộc gọi fetch trong toàn bộ ứng dụng.
 */
window.fetch = async function (resource, config) {
  // Trích xuất chuỗi URL từ tham số (hỗ trợ cả chuỗi String thông thường và đối tượng Request)
  const url = typeof resource === 'object' && resource !== null && 'url' in resource ? resource.url : String(resource);

  // Phân loại cuộc gọi:
  // - `isBackendCall`: Xác định xem request có gửi tới API của hệ thống hay không (đường dẫn tương đối / hoặc chứa API_BASE_URL).
  // - `isAuthCall`: Bỏ qua các API phục vụ đăng ký/đăng nhập/refresh/social để tránh đệ quy vô hạn khi gặp lỗi.
  const isBackendCall = url.startsWith('/') || url.startsWith(API_BASE_URL) || !url.startsWith('http');
  const isAuthCall = url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/refresh') || url.includes('/api/v1/auth/register') || url.includes('/api/v1/auth/social-login') || url.includes('/api/v1/auth/google/callback');

  // Thực hiện cuộc gọi nguyên bản (originalFetch)
  const response = await originalFetch(resource, config);

  // ĐÁNH CHẶN KHI GẶP LỖI 401 UNAUTHORIZED (TOKEN HẾT HẠN)
  if (response.status === 401 && isBackendCall && !isAuthCall) {
    const refreshToken = localStorage.getItem('refreshToken');
    
    // Nếu không có Refresh Token trong máy, không thể làm mới, trả về lỗi 401 gốc
    if (!refreshToken) {
      return response;
    }

    // NHÁNH A: NẾU CHƯA CÓ AI TIẾN HÀNH REFRESH TOKEN (ĐẦU TÀU)
    if (!isRefreshing) {
      isRefreshing = true; // Bật khóa bảo vệ

      try {
        // Gửi yêu cầu làm mới Access Token bằng hàm fetch gốc (tránh đi qua bộ đánh chặn)
        const refreshResponse = await originalFetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        // Nếu gia hạn thành công (HTTP 200)
        if (refreshResponse.ok) {
          const result = await refreshResponse.json();
          // Lấy token mới từ payload ApiResponse (hỗ trợ cả các cấu trúc lồng nhau)
          const newAccessToken = result.data?.accessToken || result.data?.token || result.token;
          const newRefreshToken = result.data?.refreshToken || result.refreshToken;

          if (newAccessToken) {
            // Lưu cặp token mới vào bộ nhớ trình duyệt
            localStorage.setItem('token', newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }

            // 1. Giải phóng hàng đợi: Chạy lại toàn bộ các request phụ đang chờ với token mới
            onRefreshed(newAccessToken);
            isRefreshing = false; // Tắt khóa bảo vệ

            // 2. Gửi lại chính request "đầu tàu" hiện tại với token mới
            const newConfig = updateAuthHeader(config, newAccessToken);
            return originalFetch(resource, newConfig);
          }
        }
        
        throw new Error('Refresh failed');
      } 
      // XỬ LÝ KHI GIA HẠN THẤT BẠI (REFRESH TOKEN HẾT HẠN HOẶC SAI CHỮ KÝ)
      catch (err) {
        isRefreshing = false;
        refreshSubscribers = []; // Hủy bỏ hàng đợi chờ đợi
        
        // Xóa sạch token cũ để tránh lặp lỗi
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');

        // Hiển thị thông báo Toast cảnh báo phiên làm việc kết thúc
        import('sonner').then(({ toast }) => {
          toast.error('Session expired. Please log in again.');
        }).catch(() => {});

        // Đẩy người dùng về trang Đăng nhập
        if (!window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login';
        }
        return response;
      }
    }

    // NHÁNH B: NẾU ĐÃ CÓ TIẾN TRÌNH REFRESH TOKEN ĐANG CHẠY (REQUEST PHỤ)
    // Trả về một Promise treo yêu cầu hiện tại, đợi đầu tàu lấy được token mới sẽ thực thi lại.
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken) => {
        const newConfig = updateAuthHeader(config, newToken);
        resolve(originalFetch(resource, newConfig)); // Chạy lại request phụ với token mới
      });
    });
  }

  // Trả về phản hồi gốc nếu không phải lỗi 401 hoặc không thuộc tập API backend
  return response;
};
