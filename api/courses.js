const { Router } = require('express')
const { ValidationError } = require("sequelize")
const { User } = require("../models/user")
const { Course, CourseClientFields } = require("../models/course")
const { validateBody } = require("../lib/bodyValidator");

const router = Router()

// Returns the list of all Courses. This list should be paginated
router.get("/", async function (req, res, next) {
    /*
     * Compute page number based on optional query string parameter `page`.
     * Make sure page is within allowed bounds.
     */
    let page = parseInt(req.query.page) || 1
    page = page < 1 ? 1 : page
    const numPerPage = 5
    const offset = (page - 1) * numPerPage

    try {
        // Stores the list of all the courses into courseList
        const courseList = await Course.findAndCountAll({
            limit: numPerPage,
            offset: offset
        })

        // Calculate the total number of pages based on the total number of courses
        const lastPage = Math.ceil(courseList.count / numPerPage)

        res.status(200).send({
            courses: courseList.rows,
            pageNumber: page,
            totalPages: lastPage,
            pageSize: numPerPage,
            totalCount: courseList.count,
        })
    } catch (e) {
        next(e)
    }
})

// Returns summary data about the Course, excluding the list of students enrolled in the course and the list of Assignments for the course.
router.get("/:id", async function (req, res, next) {
    const id = req.params.id
    
    try { 
        const course = await Course.findByPk(id)
        if (course) {
            res.status(200).send({
                subject: course.subject,
                number: course.number,
                title: course.title,
                term: course.term,
                instructorId: course.instructorId
            })
        } else { // 404
            next()
        }
    } catch (e) {
        next(e)
    }
})

// Creates a new Course with specified data and adds it to the application's database
router.post("/", validateBody(["subject", "number", "title", "term", "instructorId"]), async function (req, res, next) {
    /*
     * TODO still need to make sure only an authenticated User with 'admin' role can create a new course
     * So far all Users can create a new Course
     * 403 response needs to be added here with a middleware 
    */ 

    try {
        
        // Validate that the instructorId corresponds to a user with the 'instructor' role
        const { instructorId } = req.body;
        const instructor = await User.findOne({ where: { id: instructorId, role: "instructor" } });
        
        if (!instructor) {
            return res.status(400).send({ error: "Instructor ID does not exist or the user is not an instructor." });
        }

        // Create the new course
        const course = await Course.create(req.body, { fields: CourseClientFields })
        res.status(201).send({ id: course.id })
    } catch (e) {
        if (e instanceof ValidationError) {
            res.status(400).send({ error: e.message })
        } else {
            next(e)
        }
    }
})

// Performs a partial update on the data for the Course.
router.patch("/:id", async function (req, res, next) {
    /*
     * TODO: Make sure only auhtorized users can do this action
     * Note that enrolled students and assignments cannot be modified via this endpoint
     * Only an authenticated User with 'admin' role or an authenticated 'instructor' User whose ID matches the instructorId of the Course can update Course information.
     */ 
    const id = req.params.id
    try {
        const course = await Course.update(req.body, {
            where: { id: id},
            fields: CourseClientFields
        })
        if (course[0] > 0) {
            res.status(200).send({ message: "Course successfully updated"})
        } else {
            next()
        }
    } catch (e) {
        next(e)
    }
})

// Completely removes the data for the specified Course, including all enrolled students, all Assignments, etc
router.delete("/:id", async function (req, res, next) {
    const id = req.params.id

    try {
        const course = await Course.findByPk(id)

        if (!course) {
            return res.status(404).send({ error: "Course not found" })
        }

        await Course.destroy({ where: {id: id} })
        res.status(204).send({ message: "Course successfully deleted"})
    } catch (e) {
        next(e)
    }
})


module.exports = router