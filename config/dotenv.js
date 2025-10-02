const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  port: process.env.PORT,
  open_router: process.env.OPEN_ROUTER,
  open_url: process.env.OPEN_URL,
  cohere_key: process.env.COHERE,
  adzuna_id: process.env.ADZUNA_ID,
  adzuna_key: process.env.ADZUNA_KEY,
  supabase_url: process.env.SUPABASE_URL,
  supabase_key: process.env.SUPABASE_KEY,
};
