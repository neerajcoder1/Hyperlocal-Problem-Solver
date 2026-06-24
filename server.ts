import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable large base64 uploads for images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initializer for GoogleGenAI
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// 1. API: Analyze reported issue with Gemini
app.post("/api/analyze", async (req, res) => {
  try {
    const { description, photos } = req.body; // photos: array of base64 strings (data URLs)
    
    // Check if key is available. If not, use graceful high-quality fallback behavior.
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    
    if (!hasApiKey) {
      // Graceful high-quality mock analysis to simulate Gemini
      console.log("No GEMINI_API_KEY found, returning standard analysis simulation.");
      const category = determineCategorySimulated(description);
      const severity = determineSeveritySimulated(description);
      const title = description ? (description.slice(0, 35) + (description.length > 35 ? "..." : "")) : "Reported Hyperlocal Issue";
      
      const simulatedResult = {
        title,
        category,
        severity,
        shortAnalysis: `[Simulated AI Response - Connect Gemini API key for real analysis] Based on the description: "${description || 'No description provided'}", our AI identified a community concern.`,
        urgencyScore: severity === "Critical" ? 90 : severity === "High" ? 75 : severity === "Medium" ? 45 : 20,
        safetyHazards: [
          category === "Pothole" ? "Vehicle tire or axle damage" : "General public nuisance",
          "Pedestrian trips and falls"
        ],
        aiSuggestions: "Keep children and pets away from the area. Report to public works department as soon as possible.",
        isSimulated: true
      };
      return res.json(simulatedResult);
    }

    const ai = getGeminiClient();

    // Prepare contents parts
    const parts: any[] = [];

    // Process base64 strings if uploaded
    if (photos && Array.isArray(photos) && photos.length > 0) {
      photos.forEach((photo: string, index: number) => {
        // Strip data url prefix if present
        const base64Data = photo.includes(";base64,") ? photo.split(";base64,")[1] : photo;
        let mimeType = "image/jpeg";
        const mimeMatch = photo.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      });
    }

    // Add description prompt
    parts.push({
      text: `You are an expert civic administrator and safety analyzer for the hyperlocal reporting app "Locally".
Analyze the provided community issue images and text description: "${description || 'No text description'}"
Categorize, evaluate severity, assess hazards, and provide smart suggestions. You must reply with a valid JSON response matching the requested schema.`
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "A very brief, short actionable title (5-8 words max) summarizing the issue based on what is visible or described, e.g., 'Deep pothole on Pine street' or 'Accumulated trash blocking sidewalk'"
            },
            category: {
              type: Type.STRING,
              description: "Must be exactly one of: 'Pothole', 'Garbage Accumulation', 'Broken Streetlight', 'Water Leakage', 'Vandalism & Graffiti', 'Blocked Drain', 'Stray Animal Hazard', 'Other'"
            },
            severity: {
              type: Type.STRING,
              description: "Must be exactly one of: 'Low', 'Medium', 'High', 'Critical' depending on hazardous conditions, immediate safety, and threat to life or infrastructure."
            },
            shortAnalysis: {
              type: Type.STRING,
              description: "A friendly, professional 1-2 sentence visual and textual analysis explaining what is observed."
            },
            urgencyScore: {
              type: Type.INTEGER,
              description: "An urgency rating/score between 1 (minimal) and 100 (extreme threat)"
            },
            safetyHazards: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "At least 2 concrete hazards or risks this issue presents to citizens if left unresolved."
            },
            aiSuggestions: {
              type: Type.STRING,
              description: "Immediate safety tips or practical suggestions for nearby citizens (e.g. 'Walk on opposite sidewalk', 'Avoid driving through the water puddle')."
            }
          },
          required: ["title", "category", "severity", "shortAnalysis", "urgencyScore", "safetyHazards", "aiSuggestions"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response string from Gemini");
    }

    const result = JSON.parse(textOutput.trim());
    res.json({ ...result, isSimulated: false });

  } catch (error: any) {
    console.error("Gemini API Error (falling back to simulation):", error);
    // Graceful high-quality mock analysis to simulate Gemini on service downtime
    const description = req.body.description || '';
    const category = determineCategorySimulated(description);
    const severity = determineSeveritySimulated(description);
    const title = description ? (description.slice(0, 35) + (description.length > 35 ? "..." : "")) : "Reported Hyperlocal Issue";
    
    const simulatedResult = {
      title,
      category,
      severity,
      shortAnalysis: `[Simulated Recovery - Gemini API is temporarily busy (503)] Based on our local analyzer: "${description || 'No description provided'}", we identified a community issue.`,
      urgencyScore: severity === "Critical" ? 90 : severity === "High" ? 75 : severity === "Medium" ? 45 : 20,
      safetyHazards: [
        category === "Pothole" ? "Vehicle tire or axle damage" : "General public nuisance",
        "Pedestrian trips and falls"
      ],
      aiSuggestions: "⚠️ STAY ALERT: Keep children and pets away from the active hazard zone. Drive around the obstacle carefully. Contact local council for physical inspections.",
      isSimulated: true
    };
    return res.json(simulatedResult);
  }
});

// Helper for simulated fallback when key isn't provided
function determineCategorySimulated(desc: string): string {
  const d = (desc || "").toLowerCase();
  if (d.includes("pothole") || d.includes("pit") || d.includes("road") || d.includes("bump") || d.includes("street")) return "Pothole";
  if (d.includes("garbage") || d.includes("trash") || d.includes("litter") || d.includes("waste") || d.includes("dump")) return "Garbage Accumulation";
  if (d.includes("light") || d.includes("lamp") || d.includes("dark") || d.includes("street-light") || d.includes("streetlight")) return "Broken Streetlight";
  if (d.includes("leak") || d.includes("water") || d.includes("burst") || d.includes("flood") || d.includes("pipe")) return "Water Leakage";
  if (d.includes("graffiti") || d.includes("spray") || d.includes("paint") || d.includes("vandal")) return "Vandalism & Graffiti";
  if (d.includes("drain") || d.includes("clog") || d.includes("sewer")) return "Blocked Drain";
  if (d.includes("dog") || d.includes("cow") || d.includes("animal") || d.includes("stray") || d.includes("bite")) return "Stray Animal Hazard";
  return "Other";
}

function determineSeveritySimulated(desc: string): string {
  const d = (desc || "").toLowerCase();
  if (d.includes("danger") || d.includes("accident") || d.includes("injury") || d.includes("critical") || d.includes("broke") || d.includes("emergency") || d.includes("flood")) return "Critical";
  if (d.includes("large") || d.includes("deep") || d.includes("block") || d.includes("high") || d.includes("bad")) return "High";
  if (d.includes("small") || d.includes("little") || d.includes("minor")) return "Low";
  return "Medium";
}

// 2. API: Generate formal municipality complaint letter
app.post("/api/generate-complaint", async (req, res) => {
  try {
    const { title, description, category, severity, location, aiSuggestions } = req.body;
    const hasApiKey = !!process.env.GEMINI_API_KEY;

    if (!hasApiKey) {
      // Simulate formal complaint letter
      const addressText = location?.address || "Coordinates: " + (location?.lat ? `${location.lat}, ${location.lng}` : "Not specified");
      const simulatedLetter = `To,
The Municipal Commissioner / Ward Officer,
Local Public Works & Safety Department,
City Municipality.

Subject: Urgent Complaint Regarding ${category || 'Civic Issue'}: ${title || 'Reported Concern'} at ${addressText}

Dear Sir/Madam,

I am writing on behalf of the local residents of the community to formally report an active, unresolved public safety hazard located at:
${addressText}.

Issue Type: ${category || 'General Issue'}
Severity Assessment: ${severity || 'Medium'}

Description of Grievance:
${description || 'No detailed description was provided by the citizen.'}

This issue poses direct risks to our neighborhood, including potential injuries and disruption of civic operations. Immediate advice issued notes the following hazards and safety strategies:
${aiSuggestions || 'Please inspect the location as soon as possible to mitigate risks.'}

Therefore, we urgently request your department to dispatch maintenance crews, inspect the site, and implement necessary repairs or cleanup today to prevent any accidents.

Thank you for your prompt response and continuous dedication to community safety and municipal order.

Sincerely,
Locally Community App User & Concerned Citizen`;

      return res.json({ complaint: simulatedLetter, isSimulated: true });
    }

    const ai = getGeminiClient();
    const prompt = `Write a formal, polite, and persuasive official complaint letter to the Local Municipal Corporation / Public Works Department regarding the following reported community issue.
Use the following metadata:
- Title: ${title}
- Description: ${description}
- Category: ${category}
- Severity: ${severity}
- Address/Location: ${location?.address || "GPS: " + location?.lat + ", " + location?.lng}
- Immediate Concerns/Suggestions: ${aiSuggestions}

Ensure the letter has:
1. To header addressing "The Municipal Commissioner / Concerned Ward Officer"
2. Clear Subject line with urgency matches severity
3. Description of the issue and why it is a risk to public convenience or safety
4. A direct call-to-action requesting dispatch of maintenance teams or inspectors
5. Polished closing with placeholder signature for a "Concerned Community Member (via Locally app)"

Keep it well-spaced, clean, and professional. Return only the plain-text letter content.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    const textOutput = response.text || "Failed to generate text";
    res.json({ complaint: textOutput.trim(), isSimulated: false });

  } catch (error: any) {
    console.error("Gemini Generate Complaint Error (falling back to simulation):", error);
    const { title, description, category, severity, location, aiSuggestions } = req.body;
    const addressText = location?.address || "Coordinates: " + (location?.lat ? `${location.lat}, ${location.lng}` : "Not specified");
    const simulatedLetter = `To,
The Municipal Commissioner / Ward Officer,
Local Public Works & Safety Department,
City Municipality.

Subject: Urgent Complaint Regarding ${category || 'Civic Issue'}: ${title || 'Reported Concern'} at ${addressText}

Dear Sir/Madam,

I am writing on behalf of the local residents of the community to formally report an active, unresolved public safety hazard located at:
${addressText}.

Issue Type: ${category || 'General Issue'}
Severity Assessment: ${severity || 'Medium'}

Description of Grievance:
${description || 'No detailed description was provided by the citizen.'}

This issue poses direct risks to our neighborhood, including potential injuries and disruption of civic operations. Immediate advice issued notes the following hazards and safety strategies:
${aiSuggestions || 'Please inspect the location as soon as possible to mitigate risks.'}

Therefore, we urgently request your department to dispatch maintenance crews, inspect the site, and implement necessary repairs or cleanup today to prevent any accidents.

Thank you for your prompt response and continuous dedication to community safety and municipal order.

Sincerely,
Locally Community App User & Concerned Citizen`;

    return res.json({ complaint: simulatedLetter, isSimulated: true });
  }
});

// Setup Vite Dev server or Serve output static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Locally Server running on http://localhost:${PORT}`);
  });
}

startServer();
