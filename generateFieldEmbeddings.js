import { HfInference } from "@huggingface/inference";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Initialize Hugging Face client
const hf = new HfInference(process.env.HF_API_KEY);

// Comprehensive field mappings
const fieldMappings = {
  // Does [station name] have parking facilities? + Variants
  "has_parking": "Does the station have parking facilities?",
  "has_parking_alt1": "Is parking available at the station?",
  "has_parking_alt2": "Can I park my car at the station?",

  // Is the parking lot open to the public? + Variants
  "public_access": "Is the parking lot open to the public?",
  "public_access_alt1": "Is the parking lot open to the public or only for specific users?",
  "public_access_alt2": "Can anyone use it?",
  "public_access_alt3": "Is parking restricted at the station?",

  // Can I pre-book a parking spot at [station name]? + Variants
  "pre_booking_available": "Can I pre-book a parking spot?",
  "pre_booking_available_alt1": "Do I need to reserve a parking spot in advance?",
  "pre_booking_available_alt2": "Is parking first-come, first-served at the station?",

  // What is the parking cost? + Variants
  "parking_cost": "What is the parking cost?",
  "parking_cost_alt1": "How much does parking cost at the station?",
  "parking_cost_alt2": "Are there any parking fees at the station?",

  // What is the time limit for a parking spot after payment? + Variants
  "time_limit": "What is the time limit for a parking spot after payment?",
  "time_limit_alt1": "How long can I park after paying?",
  "time_limit_alt2": "Is there a maximum parking duration?",

  // How many parking spots are available at [station name]? + Variants
  "available_spots": "How many parking spots are available?",
  "available_spots_alt1": "Is there parking available right now?",
  
  // Total parking capacity
  "total_spots": "What’s the total parking capacity at the station?",

  // Additional details from Voice Flow and API
  "bike_parking": "Is parking available for both cars and bikes?",
  "ev_parking": "Are there separate parking areas for electric vehicles?",
  "24_7_access": "Is parking available 24/7?",
  "permit_required": "Do I need a permit to park here?",
  "restrictions": "Are there any restrictions on who can park at this lot?",
  "employee_parking": "Is there a separate parking section for employees or residents?",
  "booking_method": "How can I book a parking spot in advance?",
  "app_booking": "Is there a mobile app for booking parking?",
  "discounts": "Are there any discounts for long-term parking?",
  "payment_methods": "Can I pay for parking using cash, card, or mobile payment?",
  "monthly_pass": "Is there an option for a monthly or weekly parking pass?",
  "free_hours": "Are there any free parking hours or grace periods?",
  "overstay_consequence": "What happens if I exceed my parking time limit?",
  "overstay_penalty": "Is there a penalty for overstaying in a parking spot?",
  "disabled_spots": "Are there designated parking spots for people with disabilities?",
  "staff_parking": "Is there a separate parking area for station staff?",
  "real_time_check": "How can I check real-time parking availability?"
};

(async () => {
  const fieldEmbeddings = {};
  for (const [key, description] of Object.entries(fieldMappings)) {
    const embedding = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: description,
    });
    fieldEmbeddings[key] = embedding;
  }

  // Save to file
  fs.writeFileSync("./field_embeddings.json", JSON.stringify(fieldEmbeddings, null, 2));
  console.log("Field embeddings saved to field_embeddings.json!");
})();