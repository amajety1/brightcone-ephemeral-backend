import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { HfInference } from "@huggingface/inference";
import fs from "fs";
import levenshtein from "fast-levenshtein";
import OpenAI from "openai";

// Load precomputed embeddings
const fieldEmbeddings = JSON.parse(fs.readFileSync("./field_embeddings.json", "utf-8"));
const bartEmbedding = JSON.parse(fs.readFileSync("./bart_embedding.json", "utf-8"));
const parkingData = JSON.parse(fs.readFileSync("./parking_availability.json", "utf-8"));

dotenv.config();
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

// Initialize Hugging Face client
const hf = new HfInference(process.env.HF_API_KEY);

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const stations = Object.keys(parkingData);

// Simple in-memory conversation state (for single-user testing)
const conversationState = {};

// Cosine similarity function
const cosineSimilarity = (vecA, vecB) => {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
};

// Station matcher using Levenshtein distance (returns closest match)
const findStation = (query) => {
  const queryLower = query.toLowerCase();
  let closestMatch = null;
  let closestDistance = Infinity;

  for (const station of stations) {
    const stationLower = station.toLowerCase();
    const distance = levenshtein.get(queryLower, stationLower);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestMatch = station;
    }
  }

  return closestMatch;
};

// Handle non-BART queries with OpenAI
const handleNonBartQuery = async (query) => {
  console.log(`Non-BART question/statement: "${query}"`);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are BartBuddy, an AI assistant focused on BART-related queries. You are receiving this because the user did not ask about BART parking or services. Respond to them as if you are a normal chatbot if they are asking general questions, or however you deem appropriate" },
      { role: "user", content: ` Respond to the query: "${query}"` }
    ],
    max_tokens: 150,
  });

  return response.choices[0].message.content.trim();
};

// OpenAI API call for BART-related queries
const callLLMApi = async (query, context) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are BartBuddy, an AI assistant providing BART parking information." },
      { role: "user", content: `Based on this context: "${context}", answer the query: "${query}"` }
    ],
    max_tokens: 100,
  });

  return response.choices[0].message.content.trim();
};

// Match query to a field and get top 5
const matchField = async (query, queryEmbedding, stationData) => {
  console.log(`Field similarity scores for query: "${query}"`);
  console.log(`Available fields in fieldEmbeddings: ${Object.keys(fieldEmbeddings).join(", ")}`);
  const fieldScores = [];

  for (const [field, embedding] of Object.entries(fieldEmbeddings)) {
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    fieldScores.push({ field: field.replace(/_alt\d/, ""), similarity });
    console.log(`${field}: ${similarity.toFixed(4)}`);
  }

  // Sort by similarity and take top 5
  const topFields = fieldScores
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)
    .reduce((acc, { field }) => {
      if (stationData[field]) acc[field] = stationData[field];
      return acc;
    }, {});

  const bestField = fieldScores[0].similarity > 0.1 ? fieldScores[0].field : null;

  // Fallback for common terms if no high similarity
  if (!bestField) {
    const queryLower = query.toLowerCase();
    if (queryLower.includes("cost") || queryLower.includes("price")) {
      console.log(`Falling back to 'daily_cost' for query: "${query}"`);
      return { field: "daily_cost", topFields };
    }
    if (queryLower.includes("availability") || queryLower.includes("spots")) {
      console.log(`Falling back to 'has_parking' for query: "${query}"`);
      return { field: "has_parking", topFields };
    }
  }

  return { field: bestField, topFields };
};

app.get("/chat", async (req, res) => {
  const query = req.query.query || "No query provided";
  const sessionId = req.query.sessionId || "default"; // For multi-user, pass a unique ID
  console.log(`Received query: "${query}" (Session: ${sessionId})`);

  try {
    // Initialize state if not present
    if (!conversationState[sessionId]) {
      conversationState[sessionId] = { station: null, field: null };
    }
    console.log(`Current state: ${JSON.stringify(conversationState[sessionId])}`);

    // Generate query embedding
    const queryEmbedding = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: query,
    });

    // Check BART relevance only if no station is set yet
    if (!conversationState[sessionId].station) {
      const bartSimilarity = cosineSimilarity(queryEmbedding, bartEmbedding);
      console.log(`BART similarity score: ${bartSimilarity.toFixed(4)}`);
      if (bartSimilarity <= 0.1) {
        const response = await handleNonBartQuery(query);
        return res.json({ response });
      }
    }

    // Look for a station in the query
    const potentialStation = findStation(query);
    if (stations.includes(potentialStation) && !conversationState[sessionId].station) {
      conversationState[sessionId].station = potentialStation;
      console.log(`Station set to: ${potentialStation}`);
    }

    // Use existing station if set, otherwise ask
    const station = conversationState[sessionId].station;
    if (!station) {
      return res.json({ response: "Which BART station are you asking about?" });
    }

    // Check station data
    const stationData = parkingData[station];
    if (!stationData) {
      delete conversationState[sessionId]; // Reset state
      return res.json({ response: `No parking data found for ${station}.` });
    }

    // Look for a field in the query
    const { field: matchedField, topFields } = await matchField(query, queryEmbedding, stationData);
    if (matchedField) {
      conversationState[sessionId].field = matchedField;
      console.log(`Field set to: ${matchedField}`);
    }

    // If no field yet, ask for it
    if (!conversationState[sessionId].field) {
      return res.json({ response: `What do you want to know about parking at ${station}? (e.g., cost, availability)` });
    }

    // We have both station and field, build response
    const field = conversationState[sessionId].field;
    if (!stationData[field]) {
      delete conversationState[sessionId]; // Reset state
      return res.json({ response: `No ${field.replace(/_/g, " ")} data available for ${station}.` });
    }

    const context = `Parking data for ${station}: ${JSON.stringify(topFields)}`;
    const llmResponse = await callLLMApi(query, context);

    // Reset state after answering
    console.log("Resetting state after response");
    delete conversationState[sessionId];
    res.json({ response: llmResponse });
  } catch (error) {
    console.error(error);
    res.json({ response: "Sorry, something went wrong!" });
  }
});

app.listen(5001, () => {
  console.log("Server is running on port 5001");
});
