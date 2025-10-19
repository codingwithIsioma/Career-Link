// npm modules
const pdfParse = require("pdf-parse");
const cohere = require("cohere-ai");

// security
const {
  open_router,
  open_url,
  cohere_key,
  adzuna_id,
  adzuna_key,
} = require("../../config/dotenv");

// open_router
const OPEN_ROUTER = `${open_router}`;

// cohere setup
const Client = cohere.CohereClient;
const client = new Client({
  token: `${cohere_key}`,
});

// models
const { store_data, retrieve_data } = require("./model");

// in charge of extracting the text from the uploaded file using pdf-parse ✅
// extract the relevant words from the pdf using some nlp or ner - learn compromise or sPacy ❌
// ended up using openai for ner and word extraction ✅
// convert to openai embeddings ❌
// convert to vector embeddings using cohere ✅
// store all the details (embeddings) in supabase, with a UUID in a table ✅
// send back a UUID of those details to front-end, that will be accessed by recommendJobs and used to match jobs in that endpoint. ✅
const uploadResumeController = (req, res) => {
  if (!req.files || !req.files.resume) {
    res.status(400);
    res.end();
  }
  // parses the received file and extracts the text into a modifiable one
  pdfParse(req.files.resume)
    .then((result) => {
      // trims the text of extra whitespaces
      const data = result.text.trim().replaceAll("\n", " ");

      const country = "gb";
      fetch(
        `https://api.adzuna.com/v1/api/jobs/${country}/categories?app_id=${adzuna_id}&app_key=${adzuna_key}`
      )
        .then((res) => res.json())
        .then((tagsData) => {
          const categoryTags = tagsData.results.map((category) => {
            return category.tag;
          });

          const categoryTagList = categoryTags.join('", "');

          // uses OPENAI gpt-4.1 model to extract the relevant texts from the resume by passing it as a prompt.
          // currently using openrouter as a middle-man, cos openai won't accept payments.
          // receives the response in json format
          fetch(`${open_url}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPEN_ROUTER}`,
              "Content-Type": "application/json",
              "X-Title": "Career Link",
            },
            body: JSON.stringify({
              model: "openai/gpt-4.1-mini",
              messages: [
                {
                  role: "user",
                  content: `Extract this from the resume as raw JSON (no formatting): skills(only concrete, market-recognized, technical or domain-specific skills, exclude vague or generic terms such as 'credit', 'programming', 'documentation'; include only skills clearly supported by the resume content), tools(platforms or software), job_titles, certifications, experience(e.g "financial assistant":"8 years", from most recent to oldest), top_keywords(return a list of the top 5 keywords -job titles and technical skills only- that best represent this candidate's job search intent, suitable for API job searching), category(select one exact match from Adzuna's categories only: "${categoryTagList}", based on the overall resume context), tips(at most three concise, user-friendly and understandable suggestions based off these rules: skills too generic if: many single-word generic terms (e.g., analysis, management, operations, support, planning, research, documentation, communication, leadership, teamwork), or -ing verbs used as nouns (planning, budgeting), or no clear tool/brand/acronym signals (e.g., Excel, SQL, AWS, ISO 9001, EMR), titles too broad if: 1-2 word titles ending in generic role words (assistant, intern, associate, manager, analyst, officer, coordinator, specialist, consultant) with no domain modifier; or seniority/function only (Intern, Manager, Analyst), too few skills if skills.length < 5, tools: if tools is empty OR all tools duplicate skills, too few titles if job_titles.length < 2). Resume: ${data}`,
                },
              ],
            }),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(
                  `OpenRouter error: ${response.status} ${response.statusText}`
                );
              }
              return response.json();
            })
            .then((result) => {
              const resumeJSON = JSON.parse(result.choices[0].message.content);

              // time to convert the json response to embeddings
              // learn: how to convert to embeddings ✅
              // get the top keywords from the resume
              const topKeywords = resumeJSON.top_keywords;
              const jobCategory = resumeJSON.category;
              const skills = resumeJSON.skills;
              const tips = resumeJSON.tips;
              const recentExperience = resumeJSON.experience;
              const resumeMetadata = { tips };

              // build experience string
              let experienceList = [];
              for (const exp in recentExperience) {
                experienceList.push(`${exp} for ${recentExperience[exp]}`);
              }

              // first structures the text to be embedded, by combining it into one string.
              const buildEmbeddingInput = (data) => {
                // Extract arrays or default to empty arrays
                const skills = data.skills || [];
                const tools = data.tools || [];
                const certs = data.certifications || [];
                // Handle job titles with or without durations
                const jobTitles = (data.job_titles || []).map((title) => {
                  const duration = data.experience?.[title];
                  return duration ? `${title} (${duration})` : title;
                });
                // Merge everything into one list
                const combined = [...jobTitles, ...skills, ...tools, ...certs];
                return combined.join(", ");
              };
              // fully combined text for embedding
              const embeddingInput = buildEmbeddingInput(resumeJSON);

              // now get the embeddings from cohere.
              client
                .embed({
                  texts: [embeddingInput],
                  model: "embed-english-v3.0",
                  inputType: "classification",
                })
                .then((response) => {
                  const embeddings = response.embeddings[0];
                  // now save the embeddings into supabase and return the uuid
                  store_data({
                    embeddings,
                    topKeywords,
                    jobCategory,
                    resumeMetadata,
                  })
                    .then((response2) => {
                      if (response2.error) {
                        return res.send({
                          message: response2.error.message,
                          success: false,
                          data: null,
                        });
                      }
                      res.send({
                        message: "Upload successful!",
                        success: true,
                        data: {
                          uuid: response2.data[0].uuid,
                          recent_experience: experienceList,
                          skills_list: skills,
                        },
                      });
                    })
                    .catch((error) => {
                      console.log(error);
                      return res.send({
                        success: false,
                        message: "Error uploading to supabase",
                        data: null,
                      });
                    });
                })
                .catch((err) => {
                  console.error(`Cohere error: ${err}`);
                });
            })
            .catch((err) => console.log(err));
        })
        .catch((err) => {
          console.error("Failed to fetch tags:", err);
        });

      // catch any errors
    })
    .catch((err) => {
      console.error("Error parsing PDF:", err.message);
      res.status(400).json({ error: "Invalid or unreadable PDF file" });
    });
};

// in charge of retrieving the resume embeddings, keywords and category from supabase ✅
// fetching jobs based off the category and keywords from Adzuna api ✅
// embed the job listings gotten from the different keywords ✅
// run a cosine similarity function on the job embeddings against the resume embeddings ✅
// return the top 5 matches afer the cosine similarity and send to the frontend ✅
const recommendJobsController = (req, res) => {
  const { uuid, userPreferenceList } = req.body;

  retrieve_data({ uuid })
    .then((response) => {
      if (response.error) {
        res.send({
          success: false,
          message: response.error.message,
          data: null,
        });
      }
      // retrieve resume embeddings, keywords and category from table
      const resume_embeddings = response.data.embeddings;
      const resume_keywords = response.data.job_keywords;
      const resume_category = response.data.job_category;
      const resume_tips = response.data.resume_metadata.tips;

      // fetch jobs from api using each keyword to get a diverse list of jobs
      // can't use asynchronous cos of the ES6 modules problem
      // so using a setTimeout function to space out the api fetch requests, so i am not rate-limited
      // can't access the array directly or outside the function, because the promise or fetch calls are not completed when the setTimeout actually ends
      // so using a callback function when calling this function, i can access the array in another function, can only be passed across functions, that relate to this initial function
      const getJobListings = (keywords, callback) => {
        const page = 1;
        const results_per_page = 10;
        const country = "gb";

        let newJobListings = [];
        let completedRequests = 0;
        keywords.forEach((key, index) => {
          setTimeout(() => {
            fetch(
              `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${adzuna_id}&app_key=${adzuna_key}&results_per_page=${results_per_page}&what_or=${encodeURIComponent(
                key
              )}&max_days_old=7&category=${encodeURIComponent(
                resume_category
              )}&content-type=application/json`
            )
              .then((response) => {
                if (response.ok) {
                  return response.json();
                }
              })
              .then((data) => {
                if (data && data.results && data.results.length !== 0) {
                  newJobListings.push(...data.results);
                }
                completedRequests++;
                if (completedRequests === keywords.length) {
                  callback(newJobListings);
                }
              })
              .catch(() => {
                return res.send({
                  success: false,
                  message: "Error fetching jobs!",
                  data: null,
                });
              });
          }, (index + 1) * 1000);
        });
      };

      // callback function that works on the new array gotten
      // extracts certain information from each listing and turns it into a string
      // embeds each of them into a vector
      const structureAndEmbedJobs = (allDiverseJobs) => {
        if (!Array.isArray(allDiverseJobs) || allDiverseJobs.length === 0) {
          return res.send({
            success: false,
            message: "No jobs to embed",
            data: null,
          });
        }
        const embeddingInput = allDiverseJobs
          .map((job) => {
            const job_description = job?.description || "";
            const job_title = job?.title || "";
            const job_category = job?.category?.label || "";
            const job_tags = job?.category?.tag || "";

            return `Job title: ${job_title}, Category: ${job_category}, Description: ${job_description}, Tags: ${job_tags}`;
          })
          .filter((s) => s.trim().length > 0);

        if (embeddingInput.length === 0) {
          return res.send({
            success: false,
            message: "No valid jobs to embed",
            data: null,
          });
        }
        // embed the list of jobs here
        client
          .embed({
            texts: embeddingInput,
            model: "embed-english-v3.0",
            inputType: "classification",
          })
          .then((response) => {
            const joblisting_embeddings = response.embeddings;

            // cosine similarity of the resume vector against each job listings vector
            // formula: A * B / ||A|| * ||B||
            const cosineSimilarity = (resumeVector, jobVector, jobList) => {
              let jobAndSimilarity = [];

              jobVector.forEach((singleJobVector, index) => {
                let dotProduct = 0;
                let sqrOfResume = 0;
                let sqrOfJob = 0;

                // both resume and each job vector have the same length
                for (let i = 0; i < singleJobVector.length; i++) {
                  // dot product of each vector in both resume and job in the same index using Ai.Bi
                  dotProduct += resumeVector[i] * singleJobVector[i];

                  // get the sum of the square of each resume and job vector i.e |A|, |B|
                  sqrOfResume += resumeVector[i] ** 2;
                  sqrOfJob += singleJobVector[i] ** 2;
                }

                // get the square root i.e ||A||, ||B||
                let magOfResume = Math.sqrt(sqrOfResume);
                let magOfJob = Math.sqrt(sqrOfJob);
                // product of both magnitudes i.e ||A|| * ||B||
                let productOfMagnitudes = magOfResume * magOfJob;

                // finally the cosine function to get the similarity score
                let similarityScore = dotProduct / productOfMagnitudes;

                // return an array of the similarityScore and the matching job
                jobAndSimilarity.push({
                  job_metadata: jobList[index],
                  score: similarityScore,
                });
              });

              return jobAndSimilarity;
            };

            // runs the function to calculate cosine similarity and returns jobs with scores
            const newJobData = cosineSimilarity(
              resume_embeddings,
              joblisting_embeddings,
              allDiverseJobs
            );

            // checks and filters out duplicate jobs
            const uniqueJobs = newJobData.filter((job, index, self) => {
              const desc = job.job_metadata.description
                ?.trim()
                .toLowerCase()
                .replace(/\s+/g, " ");
              return (
                index ===
                self.findIndex((j) => {
                  const compareDesc = j.job_metadata.description
                    ?.trim()
                    .toLowerCase()
                    .replace(/\s+/g, " ");
                  return compareDesc === desc;
                })
              );
            });

            // handles the logic to boost a job or reduce its similarity score, based off it contains a liked or disliked trait
            const boostOrSkipJob = (job) => {
              if (
                !userPreferenceList ||
                userPreferenceList.length === 0 ||
                !userPreferenceList[0]
              ) {
                return; // nothing to compare
              }
              let hasDislikedBeenFound = false;
              for (const [key, value] of Object.entries(
                userPreferenceList[0]
              )) {
                if (
                  job.job_metadata.title.toLowerCase() === key ||
                  job.job_metadata.description.toLowerCase().includes(key)
                ) {
                  if (value.disliked >= 3 && value.disliked > value.liked) {
                    // reduce score
                    job.score -= 0.2;
                    hasDislikedBeenFound = true;
                  }
                }
              }

              if (!hasDislikedBeenFound) {
                for (const [key, value] of Object.entries(
                  userPreferenceList[0]
                )) {
                  if (
                    job.job_metadata.title.toLowerCase() === key ||
                    job.job_metadata.description.toLowerCase().includes(key)
                  ) {
                    if (value.liked >= 3 && value.liked > value.disliked) {
                      // boost score
                      const boost_score = 0.1;
                      job.score += boost_score;
                    }
                  }
                }
              }
            };

            // work on jobs based off users preferences first, before sorting and returning jobs aligning with that preference
            // first checks if the preference list is empty or not
            if (userPreferenceList.length === 0) {
              return uniqueJobs;
            } else {
              uniqueJobs.map((job) => {
                boostOrSkipJob(job);
              });
            }

            // starts the sorting logic to arrange the jobs from the top similar score
            const sortedJobList = uniqueJobs.sort((a, b) => {
              if (a.score < b.score) {
                return 1;
              } else if (a.score > b.score) {
                return -1;
              } else {
                return 0;
              }
            });

            // returns a new array with only the top five matches
            // const topFiveMatches = sortedJobList.slice(0, 5);

            // get the relevant metadata, to be sent back to the frontend
            const topMatchesData = sortedJobList.map((jobMatch) => {
              return {
                job_title: jobMatch.job_metadata.title,
                salary: jobMatch.job_metadata.salary_max,
                job_description: jobMatch.job_metadata.description,
                company_name: jobMatch.job_metadata.company.display_name,
                apply_link: jobMatch.job_metadata.redirect_url,
                job_category: jobMatch.job_metadata.category.label,
                job_id: jobMatch.job_metadata.id,
                contract_time: jobMatch.job_metadata.contract_time,
                job_state: jobMatch.job_metadata.location.area[1],
                job_city: jobMatch.job_metadata.location.area[2],
                score: jobMatch.score,
              };
            });

            res.send({
              success: true,
              message: "Jobs fetched successfully!",
              data: topMatchesData,
              tips: resume_tips,
            });
          })
          .catch((err) => {
            console.log(`there was an error trying to embed: ${err}`);
          });
      };

      getJobListings(resume_keywords, structureAndEmbedJobs);
    })
    .catch((error) => {
      console.log(error);
      return res.send({
        success: false,
        message: "Error retrieveing from supabase",
        data: null,
      });
    });
};

// in charge of returning < 50 jobs back to the user, based off what category, job-title, or skill they want to search for ✅
const searchJobsController = (req, res) => {
  const { job_title } = req.body;

  const country = "us";
  const page = 1;
  const results_per_page = 50;

  fetch(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${adzuna_id}&app_key=${adzuna_key}&results_per_page=${results_per_page}&what_phrase=${encodeURIComponent(
      job_title
    )}&max_days_old=14&content-type=application/json`
  )
    .then((res) => {
      if (res.ok) {
        return res.json();
      }
    })
    .then((data) => {
      const searchResults = data.results;

      const uniqueResults = searchResults.filter((job, index, self) => {
        const desc = job.description?.trim().toLowerCase().replace(/\s+/g, " ");
        return (
          index ===
          self.findIndex((j) => {
            const compareDesc = j.description
              ?.trim()
              .toLowerCase()
              .replace(/\s+/g, " ");
            return compareDesc === desc;
          })
        );
      });

      res.send({
        success: true,
        message: "Jobs fetched successfully!",
        data: uniqueResults,
      });
    })
    .catch(() => {
      return res.send({
        success: false,
        message: "Error fetching jobs!",
        data: null,
      });
    });
};

module.exports = {
  uploadResumeController,
  recommendJobsController,
  searchJobsController,
};
