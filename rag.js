const { OpenAI } = require("llamaindex");
const fs = require("fs").promises;
const {
    VectorStoreIndex,
    QueryEngineTool,
    OpenAIAgent,
    Settings,
    storageContextFromDefaults,
} = require("llamaindex");
const readlineSync = require("readline-sync");
const path = require("path");

const storageFolder = "storage";

async function getTopicTypesFromStorage() {
    const folders = await fs.readdir(storageFolder);
    return folders;
}

async function createIndexesAndTools(Topics, description) {
    const index = {};
    for (const Topic of Topics) {
        const storageContext = await storageContextFromDefaults({
            persistDir: path.join(storageFolder, Topic),
        });
        const curIndex = await VectorStoreIndex.init({
            storageContext: storageContext,
        });
        index[Topic] = curIndex;
    }
    return Topics.map(Topic => {
        return new QueryEngineTool({
            queryEngine: index[Topic].asQueryEngine(),
            metadata: {
                name: `index_${Topic}`,
                description: description(Topic),
            },
        });
    });
}

function createGeneralTool() {
    return new QueryEngineTool({
        metadata: {
            name: "general_tool",
            description: `
                #ALWAYS USE THIS TOOL TO IDENTIFY WHO YOU ARE#
                Your Name Is ZEE 
                You will always said like Hiphop or Rapper
                You are the one that who know about Thai Rapper 
                Tou like to eat pad Thai
            `,
        },
    });
}

let agentInstance = null;

async function initializeAgent() {
    try {
        Settings.llm = new OpenAI({ model: "gpt-4o-mini" });
        Settings.callbackManager.on("llm-tool-call", (event) => {
            console.log(`LLM Tool Call: ${JSON.stringify(event.detail.payload)}`);
            console.log(`Tool Using : ${JSON.stringify(event.detail.payload.toolCall.name)}`);
        });

        const TopicTypes = await getTopicTypesFromStorage();
        const TopicDescription = (Topic) => `
            This tool, "vector_index_${Topic}", provides information : ${Topic}.
        `;

        const TopicTools = await createIndexesAndTools(TopicTypes, TopicDescription);
        const generalTool = createGeneralTool();
        const Tools = [...TopicTools, generalTool];

        agentInstance = new OpenAIAgent({
            tools: Tools,
            verbose: true,
        });

        console.log('Agent initialized successfully!');
        return agentInstance;
    } catch (error) {
        console.error("An error occurred while initializing the agent:", error);
        throw error;
    }
}

async function reInstallAgent(newGeneralTool = null) {
    try {
        console.log("Re-installing agent...");

        const TopicTypes = await getTopicTypesFromStorage();
        const TopicDescription = (Topic) => `
            This tool, "vector_index_${Topic}", provides information: ${Topic}.
        `;

        const TopicTools = await createIndexesAndTools(TopicTypes, TopicDescription);

        // หากมี General Tool ใหม่ ให้ใช้ General Tool นั้น
        const generalTool = newGeneralTool || createGeneralTool();
        const Tools = [...TopicTools, generalTool];

        agentInstance = new OpenAIAgent({
            tools: Tools,
            verbose: true,
        });

        console.log("Agent re-installed successfully!");
        return agentInstance;
    } catch (error) {
        console.error("Error re-installing agent: " + error);
        throw error;
    }
}

async function run() {
    try {
        await initializeAgent();
        while (true) {
            const userInput = readlineSync.question("Enter your question (type 'exit' to quit, 're-install-agent' to re-install the agent): ");
            if (userInput.toLowerCase() === 'exit') {
                console.log("Exiting...");
                break;
            } else if (userInput.toLowerCase() === 're-install-agent') {
                await reInstallAgent();
            } else if (userInput.trim() !== '') {
                const response = await agentInstance.chat({
                    message: userInput,
                });
                console.log('------------------------------------------------------');
                console.log("Response: ");
                console.log(response.message.content);
                console.log('------------------------------------------------------');
            }
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

async function updateGeneralToolDescription(newDescription) {
    try {
        console.log("Updating general tool description...");
        const updatedDescription = `
        #ALWAYS USE THIS TOOL TO IDENTIFY WHO YOU ARE#
        ${newDescription}
        `;

        const generalTool = new QueryEngineTool({
            metadata: {
                name: "general_tool",
                description: updatedDescription,
            },
        });

        // ส่ง General Tool ใหม่ไปยัง reInstallAgent
        await reInstallAgent(generalTool);
        console.log("General tool description updated successfully!");
        return { success: true, message: "General tool description updated and agent reinstalled." };
    } catch (error) {
        console.error("Error updating general tool description:", error);
        return { success: false, error: error.message };
    }
}


async function chatWithAgent(userInput) {
    if (!agentInstance) {
        await initializeAgent(); // Initialize agent if not already initialized
    }
    const response = await agentInstance.chat({ message: userInput });
    return response.message.content;
}

module.exports = { updateGeneralToolDescription, chatWithAgent, reInstallAgent };