const { Router } = require("express");

// Importing sub routers for resources
const usersRouter = require("./users")

const router = Router();

// Mounting the sub routers for specific paths
router.use("/users", usersRouter)

module.exports = router;