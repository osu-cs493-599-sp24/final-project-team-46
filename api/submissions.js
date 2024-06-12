const { Router } = require('express')
const { Course } = require("../models/course")
const { Assignment } = require("../models/assignment")
const { Submission, SubmissionClientFields } = require("../models/submission")
const { rateLimitAuth } = require("../lib/redis");
const { bodyExists } = require("../lib/bodyValidator");
const { requireAuthentication, requireUserMatchRecord } = require("../lib/auth");

const router = Router()

// Performs a partial update on the data for the Submission. This is the only way to assign a grade to a Submission.
router.patch("/:id", requireAuthentication, rateLimitAuth, bodyExists, requireUserMatchRecord((req) => req.body.assignmentId, (dataValues) => dataValues.course.dataValues.instructorId, Assignment, [Course]), async function (req, res, next) {
    const id = req.params.id
    try {
        const submission = await Submission.update(req.body, {
            where: { id: id},
            fields: SubmissionClientFields
        })
        if (submission[0] > 0) {
            res.status(200).send()
        } else {
            next()
        }
    } catch (e) {
        next(e)
    }
})



module.exports = router