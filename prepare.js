const { OpenAI } = require("llamaindex");
const fs = require("fs").promises;
const {
    Document,
    VectorStoreIndex,
    QueryEngineTool,
    OpenAIAgent,
    Settings,
    storageContextFromDefaults,
} = require("llamaindex");
const readlineSync = require("readline-sync");
const path = require("path");

const errorLogFolder = "error_log";
const dataFolder = "split_data"; // กำหนดโฟลเดอร์ที่ต้องการอ่านไฟล์

async function main() {
    try {
        // Ensure error log directory exists
        await fs.mkdir(errorLogFolder, { recursive: true });

        // Setup OpenAI and callback events
        Settings.llm = new OpenAI({ model: "gpt-4o-mini" });
        Settings.callbackManager.on("llm-tool-call", (event) => {
            console.log("llm-tool-call :", event.detail.payload);
        });
        Settings.callbackManager.on("llm-tool-result", (event) => {
            console.log("llm-tool-result :", event.detail.payload);
        });

        // อ่านไฟล์ทั้งหมดในโฟลเดอร์ที่กำหนด
        const files = await fs.readdir(dataFolder);
        const txtFiles = files.filter(file => file.endsWith(".txt"));

        for (const file of txtFiles) {
            const filePath = path.join(dataFolder, file);
            const content = await fs.readFile(filePath, "utf-8");
            const document = new Document({ text: content, id_: filePath });

            const storageContext = await storageContextFromDefaults({
                persistDir: `./storage/${path.parse(file).name}`,
            });

            // Create vector index from the document
            const index = await VectorStoreIndex.fromDocuments([document], {
                storageContext,
            });

            console.log(`Successfully embedded: ${file}`);
        }
    } catch (error) {
        console.error("An error occurred:", error);

        // Generate a unique filename for the error log
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const errorLogPath = path.join(errorLogFolder, `error_log_${timestamp}.txt`);

        // Write the error details to the log file
        await fs.writeFile(errorLogPath, `Error: ${error.message}\nStack: ${error.stack}`);
    }
}

main().catch(console.error);

async function processFile(filePath) {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        const document = new Document({ text: content, id_: filePath });

        const storageContext = await storageContextFromDefaults({
            persistDir: `./storage/${path.parse(filePath).name}`,
        });

        const index = await VectorStoreIndex.fromDocuments([document], {
            storageContext,
        });

        console.log(`Successfully embedded: ${path.basename(filePath)}`);
        return { success: true, message: `File processed: ${path.basename(filePath)}` };
    } catch (error) {
        console.error("Error processing file:", error);
        return { success: false, error: error.message };
    }
}

module.exports = { processFile };