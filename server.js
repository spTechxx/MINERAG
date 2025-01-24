const express = require("express");
const multer = require("multer");
const path = require("path");
const { processFile } = require("./prepare");
const { updateGeneralToolDescription, chatWithAgent } = require("./rag");

const app = express();
const upload = multer({ dest: "split_data/" });

app.use(express.json());

// API 1: อัปโหลดไฟล์และสร้าง Vector Index
app.post("/api/upload", upload.single("file"), async(req, res) => {
    console.log("Received file upload request:");
    console.log("File info:", req.file); // แสดงข้อมูลไฟล์ที่อัปโหลด
    const filePath = path.join("split_data", req.file.filename);
    const result = await processFile(filePath);
    console.log("File processing result:", result); // แสดงผลลัพธ์ของการประมวลผลไฟล์
    res.status(result.success ? 200 : 500).json(result);
});

// API 2: อัปเดต General Tool description และติดตั้ง Agent ใหม่
app.post("/api/update-description", async(req, res) => {
    console.log("Received update-description request:");
    console.log("Request body:", req.body); // แสดงข้อมูลที่ส่งมาจากผู้ใช้
    const { description } = req.body;
    if (!description) {
        return res.status(400).json({ success: false, error: "Description is required" });
    }

    // ส่ง description ไปอัปเดต General Tool
    const result = await updateGeneralToolDescription(description);
    console.log("Update result:", result); // แสดงผลลัพธ์การอัปเดต
    res.status(result.success ? 200 : 500).json(result);
});

// API 3: สนทนากับแชทบอท
app.post("/api/chat", async(req, res) => {
    console.log("Received chat request:");
    console.log("Request body:", req.body); // แสดงข้อความที่ผู้ใช้ส่งมา
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ success: false, error: "Text is required" });
    }
    try {
        const response = await chatWithAgent(text);
        console.log("Chatbot response:", response); // แสดงผลลัพธ์จากแชทบอท
        res.status(200).json({ success: true, response });
    } catch (error) {
        console.log("Error occurred:", error.message); // แสดงข้อผิดพลาด
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});