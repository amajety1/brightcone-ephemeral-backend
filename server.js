import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { HfInference } from "@huggingface/inference";
import fs from "fs";
import levenshtein from "fast-levenshtein";

// Load precomputed embeddings
const fieldEmbeddings = JSON.parse(fs.readFileSync("./field_embeddings.json", "utf-8"));
const bartEmbedding = JSON.parse(fs.readFileSync("./bart_embedding.json", "utf-8"));
const parkingData = JSON.parse(fs.readFileSync("./parking_availability.json", "utf-8"));

dotenv.config();
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

// Initialize Hugging Face client
const hf = new HfInference(process.env.HF_API_KEY);

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

// Placeholder for non-BART queries
const handleNonBartQuery = (query) => {
  console.log(`Non-BART question/statement: "${query}"`);
  return "I can only assist you with BART-related questions.";
};

// Placeholder LLM API call
const callLLMApi = async (query, context) => {
  const data = JSON.parse(context.split(": ")[1]);
  const field = Object.keys(data)[0];
  const value = data[field];
  return `${field.replace(/_/g, " ")} at ${context.split(": ")[0].split(" for ")[1]} is ${value}.`;
};

// Match query to a field
const matchField = async (query, queryEmbedding) => {
  console.log(`Field similarity scores for query: "${query}"`);
  for (const [field, embedding] of Object.entries(fieldEmbeddings)) {
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    console.log(`${field}: ${similarity.toFixed(4)}`);
    if (similarity > 0.7) {
      return field.replace(/_alt\d/, "");
    }
  }
  return null;
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
        return res.json({ response: handleNonBartQuery(query) });
      }
    }

    // Look for a station in the query
    const potentialStation = findStation(query);
    if (stations.includes(potentialStation)) {
      conversationState[sessionId].station = potentialStation;
    }

    // If we still don’t have a station, ask for it
    if (!conversationState[sessionId].station) {
      return res.json({ response: "Which BART station are you asking about?" });
    }

    const station = conversationState[sessionId].station;

    // Check station data
    const stationData = parkingData[station];
    if (!stationData) {
      delete conversationState[sessionId]; // Reset state
      return res.json({ response: `No parking data found for ${station}.` });
    }

    // Look for a field in the query
    const matchedField = await matchField(query, queryEmbedding);
    if (matchedField) {
      conversationState[sessionId].field = matchedField;
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

    const context = `Parking data for ${station}: ${JSON.stringify({ [field]: stationData[field] })}`;
    const llmResponse = await callLLMApi(query, context);

    // Reset state after answering
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