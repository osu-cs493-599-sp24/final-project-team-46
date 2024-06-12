const { Router } = require('express')
const { ValidationError } = require("sequelize")
const { Assignment, AssignmentClientFields } = require("../models/assignment")
const { Submission, SubmissionClientFields } = require('../models/submission')
const { Course } = require("../models/course")
const { User } = require("../models/user")
const { rateLimitAuth, rateLimitNoAuth } = require("../lib/redis");
const { validateBody, bodyExists } = require("../lib/bodyValidator");
const multer = require("multer")
const crypto = require("node:crypto")
const path = require("path");
const { requireAuthentication, requireUserMatchRecord } = require("../lib/auth");

const router = Router()

// Multer storage configuration using the original filename
const storage = multer.diskStorage({
    destination: `${__dirname}/uploads`,
    filename: (req, file, callback) => {
        const filename = crypto.pseudoRandomBytes(16).toString('hex')
        const extension = path.extname(file.originalname);
        callback(null, `${filename}${extension}`)
    }
});

// Multer upload configuration
const upload = multer({
    storage: storage
});

const matchingInstructorMiddleware = requireUserMatchRecord((req) => req.body.courseId, (dataValues) => dataValues.instructorId, Course);
const matchingInstructorMiddlewareAssignmentId = requireUserMatchRecord((req) => req.params.id, (dataValues) => dataValues.course.dataValues.instructorId, Assignment, [Course]);

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
router.patch("/:id", requireAuthentication, rateLimitAuth, matchingInstructorMiddlewareAssignmentId, bodyExists, async function (req, res, next) {
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
router.delete("/:id", requireAuthentication, rateLimitAuth, matchingInstructorMiddlewareAssignmentId, async function (req, res, next) {
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
router.get('/:id/submissions', requireAuthentication, rateLimitAuth, requireUserMatchRecord((req) => req.params.id, (dataValues) => dataValues.instructorId, Course), async function (req, res, next) {
    const assignmentId = parseInt(req.params.id);
    try {
        const assignment = await Assignment.findOne({
            where: { id: assignmentId },
            include: [{
                model: Submission
            }]
        });
        
        if (assignment) {
            let page = parseInt(req.query.page) || 1;
            page = page < 1 ? 1 : page;
            const numPerPage = parseInt(req.query.numPerPage) || 5;
            const offset = (page - 1) * numPerPage;

            let submissionList = assignment.submissions.slice(offset, offset + numPerPage).map(submission => submission);
            for (const submission of submissionList) {
                submission.file = `/media/submissions/${submission.file}`
            }
            res.status(200).json({
                submissions: submissionList,
                pageNumber: page,
                totalPages: Math.ceil(assignment.submissions.length / numPerPage),
                pageSize: numPerPage,
                totalCount: assignment.submissions.length
            });
        } else {
            res.status(404).send({ "error": "Assignment not found" });
        }
    } catch (e) {
        next(e);
    }
});

router.post('/:id/submissions', requireAuthentication, rateLimitAuth, upload.single('file'), async function (req, res, next) {
    /*
        This endpoint is "special" in that the middleware we're using for all of our other authentication doesn't work (efficiently) with the needs of this endpoint.
        We need to...

        1. Verify that assignmentId matches the body's assignmentId.
        2. Verify that studentId matches the student attempting to submit, unless it's an admin.
        3. Verify that the student can submit this assignment via verifying that the student is enrolled in the course the assignment belongs to.

        In addition to basic authentication, rate limiting, and body validation middleware that DO work for this endpoint.
    */

    if(!req.file) {
        return res.status(400).send({"error": "No attached file."});
    }

    if(!(req.body.assignmentId && req.body.studentId && req.body.timestamp)) {
        return res.status(400).send({"error": "Malformed body."});
    }

    const assignmentId = parseInt(req.params.id);
    const studentId = req.body.studentId;
    const { timestamp } = req.body;

    if(assignmentId != req.body.assignmentId) {
        return res.status(400).send({"error": "Assignment IDs do not match."});
    }

    if(req.role != "admin" && req.user != studentId) {
        return res.status(404).send({"error": "Attempting to submit for a different student."});
    }

    try {
        const assignment = await Assignment.findOne({ where: { id: assignmentId } });

        if (!assignment) {
            return res.status(404).send({ "error": "Assignment not found." });
        }
      
        const user = await User.findByPk(studentId, {
            include: [{
                model: Course,
                as: "enrolled_courses",
                attributes: ["id"]
            }]
        });
        if(!user) {
            return res.status(400).send({ "error": "Associated student is invalid." });
        }

        let found = false;
        for(const course of user.dataValues.enrolled_courses) {
            if(course.dataValues.id == assignment.dataValues.courseId) {
                found = true;
                break;
            }
        }

        if(!found) return res.status(400).send({ "error": "Associated student is not enrolled in this course" });

        const submission = await Submission.create({
            assignmentId,
            studentId,
            timestamp,
            file: req.file.filename, // Store the file path
        })

        res.status(201).send({
            id: submission.id,
        });
    } catch (e) {
        next(e);
    }
});


module.exports = router