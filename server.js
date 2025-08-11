// server.js (FINAL CLEANED-UP VERSION FOR API ONLY)

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

dotenv.config();
const app = express();

// Middleware ko sabse upar rakhein
app.use(cors());
app.use(express.json());

// NVIDIA Client Setup
const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NV_API_KEY,
});

// === Humne yahan se static file serving wali lines hata di hain ===

// API Route
app.post("/chat", async (req, res) => {
  const { history } = req.body;
  
  if (!history || history.length === 0) {
    return res.status(400).json({ error: "History is empty" });
  }

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const messagesForAI = history.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
    }));

    const stream = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { 
          role: "system", 
          content: `You are Grovixia, an AI assistant...` // Aapka poora prompt yahan rahega
        },
        ...messagesForAI 
      ],
      temperature: 0.7, 
      top_p: 1,
      max_tokens: 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    
    res.write('data: {"event": "done"}\n\n');
    res.end();

  } catch (error) {
    console.error("NVIDIA API Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "AI failed to respond" });
    } else {
      res.end();
    }
  }
});

// Port Setup
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});