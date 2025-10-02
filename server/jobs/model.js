const supabase = require("../../config/supabase_config");

const store_data = ({
  embeddings,
  topKeywords,
  jobCategory,
  resumeMetadata,
}) => {
  return supabase
    .from("resume_embeddings")
    .insert([
      {
        embeddings: embeddings,
        job_keywords: topKeywords,
        job_category: jobCategory,
        resume_metadata: resumeMetadata,
      },
    ])
    .select();
};

const retrieve_data = ({ uuid }) => {
  return supabase
    .from("resume_embeddings")
    .select("embeddings, job_keywords, job_category, resume_metadata")
    .eq("uuid", uuid)
    .single();
};

module.exports = { store_data, retrieve_data };
