const { Router } = require("express");
const route = Router();

// route for all endpoints available
route.use("/jobs", require("../jobs/router.js"));

module.exports = route;
