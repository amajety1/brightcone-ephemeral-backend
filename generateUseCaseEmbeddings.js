import { HfInference } from "@huggingface/inference";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Initialize Hugging Face client
const hf = new HfInference(process.env.HF_API_KEY);

// Use case mappings (same format as before, with alt variants)
const useCaseMappings = {
  "events_and_activities": [
    "What events are happening near [station name] this weekend?",
    "Are there any concerts near [station name]?",
    "Tell me about festivals near a BART station."
  ],
  "restaurants_and_dining": [
    "What are the best restaurants near [station name]?",
    "Where can I get coffee near [station name]?",
    "Find a family-friendly restaurant near a BART station."
  ],
  "sports_and_entertainment": [
    "How do I get to Oracle Park using BART?",
    "Where can I watch a Warriors game near BART?",
    "Find a live music venue near a BART station."
  ],
  "general_parking_information": [
    "Does [station name] have parking facilities?",
    "Is the parking lot open to the public or only for specific users?",
    "How many parking spots are available at [station name]?",
    "What is the parking cost at [station name]?",
    "What is the time limit for a parking spot after payment?",
    "Can I pre-book a parking spot at [station name]?"
  ],
  "types_of_parking": [
    "What types of parking are available at [station name]?",
    "Does [station name] have EV parking spots?",
    "Is there designated parking for carpool vehicles?",
    "Are there multi-day or long-term parking options?",
    "Is public parking available?",
    "Is there any special kind of parking for the disabled?"
  ],
  "daily_multiday_monthly_ev_parking": [
    "What is the cost of daily parking at [station name]?",
    "Are there any discounts available for daily parking at [station name]?",
    "What is the cost of multi-day parking at [station name]?",
    "Are there any multi-day parking discounts available at [station name]?",
    "What are the monthly parking hours at [station name]?",
    "Is there free EV parking at [station name]?"
  ],
  "non_bart_parking": [
    "Are non-BART parking lots open 24/7?",
    "What is the parking rate for non-BART parking lots near [station name]?"
  ],
  "general_service_alerts": [
    "Are there any service alerts affecting BART?",
    "Can you show me the latest BART service updates?",
    "Are there any planned maintenance or service disruptions on BART?",
    "Are there any station closures or delays I should be aware of?",
    "Are there any emergency service disruptions affecting BART?"
  ],
  "elevator_escalator_alerts": [
    "Are there any elevator outages at [station name]?",
    "Are there any BART elevator service alerts today?",
    "How do I get alerts for BART elevator service issues at [station name]?",
    "Where can I find the latest BART elevator service advisories for [station name]?",
    "How can I check if elevators at BART stations are operational?"
  ],
  "station_schedule": [
    "Are there any delays or service disruptions at [station name]?",
    "What time does the first and last train depart from [station name] on weekends?",
    "How frequently do trains depart from [station name] during peak and non-peak hours?",
    "Does the schedule change on holidays or special events at [station name]?",
    "Is [station name] currently open, and are there any maintenance activities affecting service?"
  ],
  "specific_time_schedule": [
    "What is the earliest train from [station name] on weekdays/weekends?",
    "What time does the last train leave [station name] tonight?",
    "Are there late-night or overnight trains available from [station name]?",
    "Do weekend or holiday schedules affect train times at [station name]?"
  ],
  "route_schedule": [
    "What is the schedule for trains from [station A] to [station B]?",
    "How many stops are there between [station A] and [station B]?",
    "Are there direct trains between [station A] and [station B], or do I need to transfer?",
    "How often do trains run between [station A] and [station B] during peak and non-peak hours?",
    "What are the alternative routes if there are no direct trains between [station A] and [station B]?"
  ],
  "real_time_train_status": [
    "What is the real-time status of the [train name/number]?",
    "Is [train name/number] delayed?",
    "What is the next available train from [station name]?"
  ],
  "transit_connections": [
    "Fastest route to Oakland International Airport (OAK) via BART?",
    "What is the estimated walking time to the nearest bus stop from [station name]?",
    "Are there bike-sharing or scooter options near [station name] to reach the nearest rail service?",
    "What are the next available bus options from [station name]?"
  ],
  "find_nearest_transit_connection": [
    "Is the nearest bus or rail service currently operating?",
    "Which bus or rail lines are available near [station name]?",
    "How frequently does the nearest bus or rail service run?",
    "Is there a park-and-ride facility near the nearest bus or rail stop?",
    "Are there night services available for the nearest bus route?",
    "What are the first and last operating times for the nearest rail service?"
  ],
  "connecting_routes": [
    "Where can I check the schedule for the next Caltrain connection at [station name] after taking BART?",
    "How frequently does Caltrain operate at [station name] for passengers connecting from BART?",
    "What is the expected wait time at [station name] before transferring from BART to an AC Transit bus?",
    "What is the last available BART connection from [station name] to [destination] for the day?"
  ]
};

(async () => {
  const useCaseEmbeddings = {};

  // Iterate through each use case and generate embeddings for each question
  for (const [useCase, questions] of Object.entries(useCaseMappings)) {
    const embeddingsForUseCase = [];
    
    for (const question of questions) {
      const embedding = await hf.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: question,
      });
      embeddingsForUseCase.push(embedding);
    }

    // Store the embeddings for each use case
    useCaseEmbeddings[useCase] = embeddingsForUseCase;
  }

  // Save embeddings to a JSON file
  fs.writeFileSync("./use_case_embeddings.json", JSON.stringify(useCaseEmbeddings, null, 2));
  console.log("Use case embeddings saved to use_case_embeddings.json!");
})();
