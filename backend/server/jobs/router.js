const { Router } = require("express");
const {
  uploadResumeController,
  recommendJobsController,
  searchJobsController,
} = require("./controller");
const route = Router();

route.post("/upload_resume", uploadResumeController);
route.post("/recommend_jobs", recommendJobsController);
route.post("/search_jobs", searchJobsController);

module.exports = route;
