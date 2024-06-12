const { Router } = require('express')
const { ValidationError } = require("sequelize")
const { Assignment, AssignmentClientFields } = require("../models/assignment")
const { rateLimitAuth, rateLimitNoAuth } = require("../lib/redis");
const { validateBody, bodyExists } = require("../lib/bodyValidator");
const { Submission, SubmissionClientFields } = require('../models/submission')
const express = require('express')
const multer = require("multer")
const crypto = require("node:crypto")
const path = require("path");
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


// Create and store a new Assignment with specified data and adds it to the application's database
router.post("/", rateLimitNoAuth, async function (req, res, next) {

    // Once again will need to implement proper middleware to make sure only 
    // Instructors can create assignments, so far everyone can create assignments
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
router.patch("/:id", rateLimitAuth, bodyExists, async function (req, res, next) {
    /*
     * Only an authenticated User with 'admin' role or an authenticated 'instructor' 
     * User whose ID matches the instructorId of the Course corresponding to the Assignment's courseId can update an Assignment.
     */
    const id = req.params.id
    try {
        const assignment = await Assignment.update(req.body, {
            where: { id: id},
            fields: AssignmentClientFields
        })
        if (assignment[0] > 0) {
            res.status(200).send({ message: "Assignment successfully updated"})
        } else {
            next()
        }
    } catch (e) {
        next(e)
    }
})

// Completely removes the data for the specified Assignment, including all submissions
router.delete("/:id", rateLimitAuth, async function (req, res, next) {
    const id = req.params.id
    try {
        const assignment = await Assignment.findByPk(id)

        if (!assignment) {
            return res.status(404).send({ error: "Assignment not found" })
        }

        await Assignment.destroy({ where: { id: id }})
        res.status(204).send({ message: "Assigment successfully deleted" })
    } catch(e) {
        next(e)
    }
})

// Returns the list of all Submissions for an Assignment. This list should be paginated
router.get('/:id/submissions', async function (req, res, next) {
    const assignmentId = parseInt(req.params.id);
    try {
        const assignment = await Assignment.findOne({
            where: { id: assignmentId },
            include: [{
                model: Submission,
                // DEBUG
                // attributes: ['id'] // Only fetch User IDs
            }]
        });
        
        if (assignment) {
            let submissionList = assignment.submissions.map(submission => submission);
            for (const submission of submissionList) {
                submission.file = `/media/submissions/${submission.file}`
            }
            res.status(200).json(submissionList);
        } else {
            res.status(404).send({ message: "Assignment not found" });
        }
    } catch (e) {
        next(e);
    }
});

// Create and store a new Assignment with specified data and adds it to the application's database
router.post('/:id/submissions', upload.single('file'), async function (req, res, next) {
    const assignmentId = parseInt(req.params.id);
    const studentId = req.body.studentId;
    const { timestamp } = req.body;

    try {
        const assignment = await Assignment.findOne({ where: { id: assignmentId } });

        if (!assignment) {
            return res.status(404).send({ error: "string" });
        }

        const submission = await Submission.create({
            assignmentId,
            studentId,
            timestamp,
            file: req.file.filename, // Store the file path
        });

        res.status(201).send({
            id: submission.id,
        });
    } catch (e) {
        next(e);
    }
});


module.exports = router