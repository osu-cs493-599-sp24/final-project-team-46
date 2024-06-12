const { Router } = require('express')
const { ValidationError } = require("sequelize")
const { User } = require("../models/user")
const { Course } = require("../models/course")
const { Assignment, AssignmentClientFields } = require("../models/assignment")

const router = Router()

// Create and store a new Assignment with specified data and adds it to the application's database
router.post("/", async function (req, res, next) {

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
router.get("/:id", async function (req, res, next) {
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
router.patch("/:id", async function (req, res, next) {
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

module.exports = router