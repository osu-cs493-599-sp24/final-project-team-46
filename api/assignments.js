const { Router } = require('express')
const { ValidationError } = require("sequelize")
const { User } = require("../models/user")
const { Course } = require("../models/course")
const { Assignment, AssignmentClientFields } = require("../models/assignment")
const { Submission, SubmissionClientFields } = require('../models/submission');
const { rateLimitAuth, rateLimitNoAuth } = require("../lib/redis");
const { validateBody, bodyExists } = require("../lib/bodyValidator");
const { requireAuthentication, requireUserMatchRecord } = require("../lib/auth");

const router = Router()

const matchingInstructorMiddleware = requireUserMatchRecord((req) => req.body.courseId, (dataValues) => dataValues.instructorId, Course);

// Create and store a new Assignment with specified data and adds it to the application's database
router.post("/", requireAuthentication, rateLimitAuth, validateBody(AssignmentClientFields), matchingInstructorMiddleware, async function (req, res, next) {
    try {
        const assignment = await Assignment.create(req.body, { fields: AssignmentClientFields})
        res.status(201).send({ id: assignment.id })
    } catch (e) {
        if (e instanceof ValidationError) {
            res.status(400).send({ error: e.message })
        } else {
            next(e)
        } 
    }
})

// Returns summary data about the Assignment, excluding the list of Submissions.
router.get("/:id", rateLimitNoAuth, async function (req, res, next) {
    const id = req.params.id

    try {
        const assignment = await Assignment.findByPk(id)
        if (assignment) {
            res.status(200).send({
                courseId: assignment.courseId,
                title: assignment.title,
                points: assignment.points,
                due: assignment.due
            })
        } else {
            next()
        }
    } catch (e) {
        next(e)
    }
})

// Performs a partial update on the data for the Assignment. Note that submissions cannot be modified via this endpoint
router.patch("/:id", requireAuthentication, rateLimitAuth, matchingInstructorMiddleware, bodyExists, async function (req, res, next) {
    const id = req.params.id
    try {
        const assignment = await Assignment.update(req.body, {
            where: { id: id},
            fields: AssignmentClientFields
        })
        if (assignment[0] > 0) {
            res.status(200).send();
        } else {
            next()
        }
    } catch (e) {
        next(e)
    }
})

// Completely removes the data for the specified Assignment, including all submissions
router.delete("/:id", requireAuthentication, rateLimitAuth, matchingInstructorMiddleware, async function (req, res, next) {
    const id = req.params.id
    try {
        const assignment = await Assignment.findByPk(id)

        if (!assignment) {
            return res.status(404).send({ "error": "Assignment not found" })
        }

        await Assignment.destroy({ where: { id: id }})
        res.status(204).send();
    } catch(e) {
        next(e)
    }
})

// Returns the list of all Submissions for an Assignment. This list should be paginated
router.get('/:id/submissions', requireAuthentication, rateLimitAuth, matchingInstructorMiddleware, async function (req, res, next) {
    const assignmentId = parseInt(req.params.id);
    try {
        const assignment = await Assignment.findOne({
            where: { id: assignmentId },
            include: [{
                model: Submission,
                // attributes: ['id'] // Only fetch User IDs
            }]
        });
        console.log(assignment)
        if (assignment) {
            const submissionList = assignment.submissions.map(submission => submission);
            res.status(200).json(submissionList); // Send the list of student IDs
        } else {
            res.status(404).send({ "error": "Assignment not found" });
        }
    } catch (e) {
        next(e);
    }
});

router.post('/:id/submissions', requireAuthentication, rateLimitAuth, validateBody(["assignmentId", "studentId", "timestamp", "file"]), async function (req, res, next) {
    /*
        This endpoint is "special" in that the middleware we're using for all of our other authentication doesn't work (efficiently) with the needs of this endpoint.
        We need to...

        1. Verify that assignmentId matches the body's assignmentId.
        2. Verify that studentId matches the student attempting to submit, unless it's an admin.
        3. Verify that the student can submit this assignment via verifying that the student is enrolled in the course the assignment belongs to.

        In addition to basic authentication, rate limiting, and body validation middleware that DO work for this endpoint.
    */
    const assignmentId = parseInt(req.params.id);

    if(assignmentId != req.body.assignmentId) {
        return res.status(400).send({"error": "Assignment IDs do not match."});
    }

    if(req.role != "admin" && req.user != req.body.studentId) {
        return res.status(404).send({"error": "Attempting to submit for a different student."});
    }

    try {
        const assignment = await Assignment.findOne({ where: { id: assignmentId } });

        if (!assignment) {
            return res.status(404).send({ "error": "Assignment not found." });
        }

        const user = await User.findByPk(req.body.studentId, { include: Course });
        if(!user) {
            return res.status(400).send({ "error": "Associated student is invalid." });
        }

        let found = false;
        for(const course of user.dataValues.courses) {
            if(course.dataValues.id == assignment.dataValues.courseId) {
                found = true;
                break;
            }
        }

        if(!found) return res.status(400).send({ "error": "Associated student is not enrolled in this course" });

        const timestamp = new Date().toISOString(); // Get current date-time in ISO 8601 format

        const submission = await Submission.create(req.body, {
            fields: SubmissionClientFields.filter(field => field !== "grade")
        });

        res.status(201).send({ id: submission.id });
    } catch (e) {
        next(e);
    }
});

module.exports = router