const { Router } = require("express");

// Importing sub routers for resources
const usersRouter = require("./users")
const coursesRouter = require("./courses")
const assignmentsRouter = require("./assignments")
const submissionsRouter = require("./submissions")

const router = Router();

// Mounting the sub routers for specific paths
router.use("/users", usersRouter)
router.use("/courses", coursesRouter)
router.use("/assignments", assignmentsRouter)
router.use("/submissions", submissionsRouter)

module.exports = router;