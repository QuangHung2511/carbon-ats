require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();

// Bật CORS để Frontend có thể gọi được API
app.use(cors());
app.use(express.json());

// Mở cửa thư mục /uploads ra Internet để xem được PDF
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 1. DÙNG MẢNG TẠM THỜI THAY CHO MONGODB (Chuẩn mô hình PoC)
// ==========================================
let candidatesMemoryDB = [];

// ==========================================
// 2. CẤU HÌNH TRẠM GÁC MULTER NHẬN FILE
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // File sẽ được lưu vào thư mục này
    },
    filename: function (req, file, cb) {
        // Đổi tên file để không bị trùng
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // Giới hạn 5MB

// ==========================================
// 3. TẠO API NHẬN CV TỪ FRONTEND
// ==========================================
app.post('/api/apply', upload.single('cvFile'), async (req, res) => {
    try {
        const { name, phone, position, aiScore, isPass } = req.body;
        
        // Nếu không có file được gửi lên
        if (!req.file) {
            return res.status(400).json({ error: 'Không tìm thấy file CV!' });
        }

        // SỬA LỖI LOCALHOST: Tạo đường link URL động theo đúng tên miền của Render
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

        // Lưu thông tin vào Mảng bộ nhớ tạm
        const newCandidate = {
            id: Date.now().toString(), // Tự tạo ID ngẫu nhiên
            name: name,
            phone: phone,
            position: position,
            cvUrl: fileUrl, 
            aiScore: parseInt(aiScore) || 0,
            isPass: isPass === 'true',
            createdAt: new Date()
        };

        // Đẩy vào mảng thay vì gọi MongoDB
        candidatesMemoryDB.push(newCandidate);

        console.log('✅ Đã nhận và lưu hồ sơ (PoC Mode):', name);
        res.status(200).json({ message: 'Nộp hồ sơ thành công!', data: newCandidate });

    } catch (error) {
        console.error("Lỗi API Apply:", error);
        res.status(500).json({ error: 'Lỗi máy chủ Backend!' });
    }
});

// ==========================================
// 4. TẠO API LẤY DANH SÁCH ỨNG VIÊN CHO TRANG ADMIN
// ==========================================
app.get('/api/candidates', (req, res) => {
    try {
        // Lấy toàn bộ ứng viên trong mảng tạm, sắp xếp người mới nhất lên đầu
        const sortedCandidates = [...candidatesMemoryDB].sort((a, b) => b.createdAt - a.createdAt);
        res.status(200).json(sortedCandidates);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi lấy dữ liệu!' });
    }
});

// ==========================================
// BẬT MÁY CHỦ
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Siêu Backend CARBON ATS đang chạy tại cổng ${PORT}`);
});