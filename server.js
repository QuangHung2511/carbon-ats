 require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();

// Bật CORS để Frontend (127.0.0.1:5500) có thể gọi được API này
app.use(cors());
app.use(express.json());

// Mở cửa thư mục /uploads ra Internet để trang Admin có thể xem được PDF
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 1. KẾT NỐI MONGODB
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 Đã kết nối thành công tới Database MongoDB!'))
    .catch(err => console.error('🔴 Lỗi kết nối Database:', err));

// Định nghĩa Cấu trúc Dữ liệu Ứng viên (Schema)
const candidateSchema = new mongoose.Schema({
    name: String,
    phone: String,
    position: String,
    cvUrl: String, // ĐÂY LÀ NƠI LƯU ĐƯỜNG LINK FILE PDF
    aiScore: { type: Number, default: 0 },
    isPass: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Candidate = mongoose.model('Candidate', candidateSchema);

// ==========================================
// 2. CẤU HÌNH TRẠM GÁC MULTER NHẬN FILE
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // File sẽ được lưu vào thư mục này
    },
    filename: function (req, file, cb) {
        // Đổi tên file để không bị trùng (Thêm mốc thời gian vào trước tên file)
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

        // Tạo đường link URL để xem file (Ví dụ: http://localhost:5000/uploads/123-cv.pdf)
        const fileUrl = `http://localhost:${process.env.PORT || 5000}/uploads/${req.file.filename}`;

        // Lưu thông tin vào MongoDB
        const newCandidate = new Candidate({
            name: name,
            phone: phone,
            position: position,
            cvUrl: fileUrl, // Lưu cái "Vé" vào DB
            aiScore: parseInt(aiScore),
            isPass: isPass === 'true' // Chuyển chuỗi thành boolean
        });

        await newCandidate.save();

        console.log('✅ Đã nhận và lưu hồ sơ:', name);
        res.status(200).json({ message: 'Nộp hồ sơ thành công!', data: newCandidate });

    } catch (error) {
        console.error("Lỗi API Apply:", error);
        res.status(500).json({ error: 'Lỗi máy chủ Backend!' });
    }
});

// ==========================================
// 4. TẠO API LẤY DANH SÁCH ỨNG VIÊN CHO TRANG ADMIN
// ==========================================
app.get('/api/candidates', async (req, res) => {
    try {
        // Lấy toàn bộ ứng viên, sắp xếp người mới nhất lên đầu
        const candidates = await Candidate.find().sort({ createdAt: -1 });
        res.status(200).json(candidates);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi lấy dữ liệu!' });
    }
});

// Bật máy chủ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy trên port ${PORT}`);
    console.log(`🚀 Siêu Backend CARBON ATS đang chạy tại cổng ${PORT}`);
});