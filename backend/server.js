import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { HfInference } from "@huggingface/inference";
import fs from "fs";
import FuzzySearch from "fuzzy-search"; // Import the fuzzy-search library

dotenv.config();

// Initialize Hugging Face client
const hf = new HfInference(process.env.HF_API_KEY);

// Load the comprehensive BART embedding
const bartEmbedding = JSON.parse(fs.readFileSync("./bart_embedding.json", "utf-8"));

// Load the use case embeddings with queries
const useCaseEmbeddingsWithQueries = JSON.parse(fs.readFileSync("./use_case_embeddings_with_queries.json", "utf-8"));
const useCaseKeys = Object.keys(useCaseEmbeddingsWithQueries); // Use case keys like "events_and_activities", etc.

// Load the use case-specific requirements (e.g., from first_three_cases.json)
const useCaseRequirements = JSON.parse(fs.readFileSync("./first_three_cases.json", "utf-8"));

// Log just the use case requirements structure
console.log("=== USE CASE REQUIREMENTS STRUCTURE ===");
for (const useCase of Object.keys(useCaseRequirements)) {
  console.log(`\n${useCase}:`);
  console.log(`  Required info: ${JSON.stringify(useCaseRequirements[useCase].required_info)}`);
  
  // Log available stations for this use case (just the keys, not all the data)
  const stationKeys = Object.keys(useCaseRequirements[useCase]).filter(key => key !== 'required_info');
  console.log(`  Available stations: ${stationKeys.join(', ')}`);
  
  // For the first station, show what keys are available (to understand the structure)
  if (stationKeys.length > 0) {
    const firstStation = stationKeys[0];
    const dataKeys = Object.keys(useCaseRequirements[useCase][firstStation]);
    console.log(`  Data fields for ${firstStation}: ${dataKeys.join(', ')}`);
  }
}
console.log("=== END OF USE CASE REQUIREMENTS ===\n");

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

// Cosine similarity function
const cosineSimilarity = (vecA, vecB) => {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
};

// Predefined list of event types
const eventTypes = [
  "nearby_events",
  "warriors_game",
  "live_music",
];

// Check if the query is BART-related by comparing with the comprehensive BART embedding
const isBartQuery = async (query) => {
  const queryEmbedding = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: query,
  });

  const bartSimilarity = cosineSimilarity(queryEmbedding, bartEmbedding);
  console.log(`BART similarity: ${bartSimilarity}`);
  return bartSimilarity >= 0.1 ? bartSimilarity : null;
};

// Find top N closest use cases based on cosine similarity
const findTopUseCases = async (query) => {
  const queryEmbedding = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: query,
  });

  const similarityScores = [];

  for (const useCase of useCaseKeys) {
    const questions = useCaseEmbeddingsWithQueries[useCase];

    for (const { question, embedding: useCaseEmbedding } of questions) {
      if (Array.isArray(useCaseEmbedding) && useCaseEmbedding.length > 0) {
        const similarity = cosineSimilarity(queryEmbedding, useCaseEmbedding);
        similarityScores.push({ useCase, question, similarity });
      }
    }
  }

  const topUseCases = similarityScores
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return topUseCases;
};

// Station name matching using Levenshtein distance
const getBestMatch = (query, stations) => {
  // Define station name mappings to ensure exact matches with first_three_cases.json
  const stationMappings = {
    // MacArthur variations
    "macarthur": "MacArthur",
    "mac arthur": "MacArthur",
    "mcarthur": "MacArthur",
    "mc arthur": "MacArthur",
    
    // Fruitvale variations
    "fruitvale": "Fruitvale",
    "fruit vale": "Fruitvale",
    "fruitvail": "Fruitvale",
    
    // Oakland variations
    "oakland": "Oakland",
    "oak land": "Oakland",
    "okland": "Oakland",
    "oaklnd": "Oakland",
    "oakand": "Oakland",
    "downtown oakland": "Oakland",
    "oakland downtown": "Oakland"
  };

  // First check if the query directly contains a known station name variation
  const lowerQuery = query.toLowerCase();
  
  for (const [variation, standardName] of Object.entries(stationMappings)) {
    if (lowerQuery.includes(variation)) {
      return standardName;
    }
  }

  // Levenshtein distance calculation
  const levenshteinDistance = (a, b) => {
    const matrix = Array(a.length + 1).fill().map(() => Array(b.length + 1).fill(0));
    
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    return matrix[a.length][b.length];
  };
  
  // Find the closest match for each word in the query
  const words = lowerQuery.split(/\s+/);
  let bestMatch = null;
  let bestDistance = Infinity;
  
  for (const word of words) {
    if (word.length > 3) { // Only check words with more than 3 characters
      for (const station of stations) {
        const distance = levenshteinDistance(word.toLowerCase(), station.toLowerCase());
        // Normalize the distance by the length of the longer string
        const normalizedDistance = distance / Math.max(word.length, station.length);
        
        if (normalizedDistance < bestDistance) {
          bestDistance = normalizedDistance;
          bestMatch = station;
        }
      }
    }
  }
  
  // Only accept matches with a reasonable distance (less than 0.5 normalized)
  if (bestMatch && bestDistance < 0.5) {
    console.log(`Found match using Levenshtein: best match="${bestMatch}", distance=${bestDistance.toFixed(2)}`);
    return bestMatch;
  }
  
  console.log("No good Levenshtein match found, defaulting to MacArthur");
  return "MacArthur"; // Default to MacArthur if no good match found
};

// Event type matching based on embeddings
const getEventType = async (query) => {
  // Create a mapping between user-friendly terms and the required keys
  const eventTypeMapping = {
    "Sports": "nearby_events",
    "Events": "nearby_events",
    "Local events": "nearby_events",
    "Nearby events": "nearby_events",
    "Warriors": "warriors_game",
    "Warriors Game": "warriors_game",
    "Basketball": "warriors_game",
    "Game": "warriors_game",
    "Music": "live_music",
    "Live Music": "live_music",
    "Concert": "live_music",
    "Show": "live_music",
    "Performance": "live_music",
  };

  const queryEmbedding = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: query,
  });

  // Create embeddings for user-friendly terms
  const userFriendlyTerms = Object.keys(eventTypeMapping);
  const termEmbeddings = await Promise.all(userFriendlyTerms.map((term) => 
    hf.featureExtraction({ model: "sentence-transformers/all-MiniLM-L6-v2", inputs: term })
  ));

  // Calculate similarity with user-friendly terms
  const similarityScores = termEmbeddings.map((embedding, idx) => ({
    term: userFriendlyTerms[idx],
    similarity: cosineSimilarity(queryEmbedding, embedding),
  }));

  // Sort by similarity and get the best match
  similarityScores.sort((a, b) => b.similarity - a.similarity);
  const bestMatch = similarityScores[0].term;
  
  // Map the best match to one of the three required event types
  return eventTypeMapping[bestMatch] || "nearby_events"; // Default to nearby_events if no match
};

app.get("/chat", async (req, res) => {
  const query = req.query.query || "No query provided";

  try {
    // Check if it's a BART-related query
    console.log(`Checking if query: "${query}" is BART-related...`);
    const bartSimilarity = await isBartQuery(query);

    if (bartSimilarity) {
      console.log(`BART-related query detected! Similarity Score: ${bartSimilarity.toFixed(4)}`);

      // Step 1: Find the top 5 matching use cases
      const topUseCases = await findTopUseCases(query);

      // Step 2: Check required information for each use case and get the necessary data
      const matchedInfo = {};
      const calculatedInfo = {}; // Memoization cache to avoid recalculating the same requirements

      for (const useCaseInfo of topUseCases) {
        const { useCase, similarity, question } = useCaseInfo;
        console.log(`Use case: ${useCase} - Similarity: ${similarity.toFixed(4)} - Question: "${question}"`);

        // Get the required info for the matched use case
        const requiredInfo = useCaseRequirements[useCase]?.required_info || [];

        // For each required info, check if it's needed and fetch (with memoization)
        for (const info of requiredInfo) {
          // If we've already calculated this info, don't recalculate
          if (calculatedInfo[info]) {
            console.log(`Using cached value for ${info}: ${calculatedInfo[info]}`);
            matchedInfo[info] = calculatedInfo[info];
            continue;
          }

          if (info === "station_name") {
            const matchedStation = getBestMatch(query, ["MacArthur", "Fruitvale", "Oakland"]);
            matchedInfo[info] = matchedStation;
            calculatedInfo[info] = matchedStation; // Cache the result
          } else if (info === "event_type") {
            const eventType = await getEventType(query);
            matchedInfo[info] = eventType;
            calculatedInfo[info] = eventType; // Cache the result
          }
        }
      }

      console.log("Matched Information:", matchedInfo);

      // Step 3: Fetch the specific information from first_three_cases.json for each use case
      const filteredUseCases = {};
      
      for (const useCaseInfo of topUseCases) {
        const { useCase, similarity } = useCaseInfo;
        
        // Skip if the use case doesn't exist in our requirements
        if (!useCaseRequirements[useCase]) continue;
        
        // Get required info for this use case
        const requiredInfo = useCaseRequirements[useCase]?.required_info || [];
        
        // Check if we have all required info for this use case
        const hasAllRequiredInfo = requiredInfo.every(info => matchedInfo[info]);
        
        if (hasAllRequiredInfo) {
          // For use cases that need both station_name and event_type
          if (requiredInfo.includes("station_name") && requiredInfo.includes("event_type")) {
            const stationInfo = useCaseRequirements[useCase][matchedInfo.station_name];
            if (stationInfo && stationInfo[matchedInfo.event_type]) {
              filteredUseCases[useCase] = {
                similarity: similarity.toFixed(4),
                info: stationInfo[matchedInfo.event_type],
                requirements: {
                  station_name: matchedInfo.station_name,
                  event_type: matchedInfo.event_type
                }
              };
              console.log(`Found specific response for ${useCase} with ${matchedInfo.station_name} and ${matchedInfo.event_type}`);
            }
          } 
          // For use cases that only need station_name
          else if (requiredInfo.includes("station_name")) {
            const stationInfo = useCaseRequirements[useCase][matchedInfo.station_name];
            if (stationInfo) {
              filteredUseCases[useCase] = {
                similarity: similarity.toFixed(4),
                info: stationInfo,
                requirements: {
                  station_name: matchedInfo.station_name
                }
              };
              console.log(`Found response for ${useCase} with ${matchedInfo.station_name}`);
            }
          }
        }
      }

      return res.json({
        response: "BART-related query",
        bartSimilarity: bartSimilarity.toFixed(4),
        matchedInfo,
        filteredUseCases
      });
    } else {
      console.log("Not a BART-related query");
      return res.json({
        response: "Not a BART query",
      });
    }

  } catch (error) {
    console.error(error);
    res.json({ response: "Sorry, something went wrong!" });
  }
});

app.listen(5001, () => {
  console.log("Server is running on port 5001");
});
