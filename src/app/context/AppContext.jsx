import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../api.js';

const AppContext = createContext(undefined);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(true); // Thêm trạng thái loading để tránh văng về login lúc app đang khởi tạo
  const [storageInfo, setStorageInfo] = useState(null);
  const [selectedDocsForChat, setSelectedDocsForChat] = useState([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // =========================================================================
  // HÀM LẤY THÔNG TIN DUNG LƯỢNG LƯU TRỮ (GET /api/v1/users/storage)
  // - Hoạt động: Thực hiện yêu cầu HTTP GET với token của user để lấy dữ liệu về lưu trữ.
  // - Mục đích: Lấy thông tin dung lượng đã dùng (`storageUsed`), giới hạn dung lượng (`storageLimit`), 
  //   và tên gói hiện tại (`planName`) để lưu vào state `storageInfo` dùng chung cho toàn bộ ứng dụng 
  //   (ví dụ: hiển thị tiến trình dung lượng hoặc cảnh báo).
  // =========================================================================
  const fetchStorageInfo = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/storage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success && result.data) {
        setStorageInfo(result.data);
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin dung lượng:", error);
    }
  };

  // =========================================================================
  // HÀM KHÔI PHỤC PHIÊN ĐĂNG NHẬP (GET /api/v1/users/profile)
  // - Hoạt động: Chạy khi người dùng tải lại trang (F5).
  //   1. Đọc mã AccessToken từ LocalStorage. Nếu tồn tại, gửi request GET xác thực tới API lấy thông tin Profile.
  //   2. Nếu token hợp lệ, lưu thông tin phản hồi vào state `user` nhằm khôi phục trạng thái đăng nhập cho Client.
  //   3. Nếu token hết hạn hoặc không hợp lệ (API trả về lỗi), tự động xóa token hỏng khỏi LocalStorage.
  //   4. Cuối cùng chuyển trạng thái `loading` thành `false` để kích hoạt kết xuất giao diện chính.
  // =========================================================================
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const result = await response.json();
          if (result.success) {
            setUser(result.data); // Khôi phục user thành công
          } else {
            localStorage.removeItem('token'); // Token hết hạn hoặc sai
          }
        } catch (error) {
          console.error("Lỗi khôi phục session:", error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false); // Kết thúc quá trình kiểm tra
    };

    restoreSession();
  }, []);

  // Tự động lấy thông tin dung lượng lưu trữ khi có user đăng nhập
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (user && token) {
      fetchStorageInfo(token);
    } else {
      setStorageInfo(null);
    }
  }, [user]);

  // =========================================================================
  // HÀM ĐĂNG XUẤT HỆ THỐNG (POST /api/v1/auth/logout)
  // - Hoạt động:
  //   1. Chuyển trạng thái `isLoggingOut` thành `true`.
  //   2. Lấy token hiện tại và gửi yêu cầu POST đăng xuất tới API `/auth/logout` để server thực hiện 
  //      đưa token này vào danh sách đen (blacklist) trong cơ sở dữ liệu/Redis và hủy refresh token.
  //   3. Bất kể API phản hồi thành công hay gặp lỗi mạng, phía Client vẫn tiến hành xóa sạch 
  //      token, user state và dữ liệu dung lượng lưu trữ (`storageInfo`) khỏi bộ nhớ để đảm bảo an toàn.
  // =========================================================================
  const logout = async () => {
    setIsLoggingOut(true);
    const token = localStorage.getItem('token');

    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Lỗi khi gọi API logout:', error);
      }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('skippedSurvey');
    setUser(null);
    setStorageInfo(null);
    setIsLoggingOut(false);
  };

  const toggleAdminMode = () => setIsAdminMode(!isAdminMode);

  const updateProfile = (updates) => {
    if (user) setUser({ ...user, ...updates });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user,
        isAdminMode,
        setIsAdminMode,
        logout,
        toggleAdminMode,
        updateProfile,
        loading,
        storageInfo,
        refetchStorage: () => {
          const token = localStorage.getItem('token');
          if (token) fetchStorageInfo(token);
        },
        selectedDocsForChat,
        setSelectedDocsForChat
      }}
    >
      {isLoggingOut ? (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100" style={{ background: 'linear-gradient(135deg, rgba(253, 143, 82, 0.05) 0%, rgba(254, 103, 110, 0.05) 50%, rgba(255, 189, 113, 0.05) 100%)' }}>
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem', color: '#FD8F52', borderColor: '#FD8F52', borderRightColor: 'transparent' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="fw-bold mb-1" style={{ color: '#C73866' }}>Logging out...</h5>
          <p className="text-muted small mb-0">Please wait while we secure your session.</p>
        </div>
      ) : (
        !loading && children
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

