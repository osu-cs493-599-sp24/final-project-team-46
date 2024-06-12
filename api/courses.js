const { Router } = require('express')
const { ValidationError } = require("sequelize")
const { User } = require("../models/user")
const { Assignment } = require("../models/assignment")
const { Course, CourseClientFields } = require("../models/course")
const { requireAuthentication, requireAdmin, requireUserMatchRecord } = require("../lib/auth");
const { rateLimitAuth, rateLimitNoAuth } = require("../lib/redis");
const { validateBody, bodyExists } = require("../lib/bodyValidator");

const router = Router()

const matchingInstructorMiddleware = requireUserMatchRecord((req) => req.params.id, (dataValues) => dataValues.instructorId, Course);

// Returns the list of all Courses. This list should be paginated
router.get("/", rateLimitNoAuth, async function (req, res, next) {
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
router.get("/:id", rateLimitNoAuth, async function (req, res, next) {
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
router.post("/", requireAuthentication, rateLimitAuth, requireAdmin, validateBody(CourseClientFields), async function (req, res, next) {
    try {
        
        // Validate that the instructorId corresponds to a user with the 'instructor' role
        const { instructorId } = req.body;
        const instructor = await User.findOne({ where: { id: instructorId, role: "instructor" } });
        console.log(instructor)
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
router.patch("/:id", requireAuthentication, rateLimitAuth, requireUserMatchRecord((req) => req.params.id, (dataValues => dataValues.instructorId), Course), bodyExists, async function (req, res, next) {
    const id = req.params.id
    try {
        const course = await Course.update(req.body, {
            where: { id: id},
            fields: CourseClientFields
        })
        if (course[0] > 0) {
            res.status(200).send();
        } else {
            next()
        }
    } catch (e) {
        next(e)
    }
})

// Completely removes the data for the specified Course, including all enrolled students, all Assignments, etc
router.delete("/:id", requireAuthentication, rateLimitAuth, requireAdmin, async function (req, res, next) {
    const id = req.params.id

    try {
        const course = await Course.findByPk(id)

        if (!course) {
            return res.status(404).send({ error: "Course not found" })
        }

        await Course.destroy({ where: {id: id} })
        res.status(204).send();
    } catch (e) {
        next(e)
    }
})

// Returns a list containing the User IDs of all students currently enrolled in the Course.
router.get('/:id/students', requireAuthentication, rateLimitAuth, matchingInstructorMiddleware, async function (req, res, next) {
    const courseId = parseInt(req.params.id);
    try {
        const course = await Course.findOne({
            where: { id: courseId },
            include: [{
                model: User,
                attributes: ['id'] // Only fetch User IDs
            }]
        });
    
        if (course) {
            const studentIds = course.users.map(user => user.id);
            res.status(200).json(studentIds); // Send the list of student IDs
        } else {
            res.status(404).send({ "error": "Course not found" });
        }
    } catch (e) {
        next(e);
    }
});

// Update enrollment for a course
router.post('/:id/students', requireAuthentication, rateLimitAuth, matchingInstructorMiddleware, async function (req, res, next) {
    const courseId = parseInt(req.params.id);
    const { add, remove } = req.body;

    try {
        const course = await Course.findOne({ where: { id: courseId } });

        if (!course) {
            return res.status(404).send({ "error": "Course not found" });
        }

        // Enroll students
        if (Array.isArray(add) && add.length > 0) {
            for (const userId of add) {
                const user = await User.findByPk(userId);
                if (user) {
                    await course.addUser(user);
                }
            }
        }

        // Unenroll students
        if (Array.isArray(remove) && remove.length > 0) {
            for (const userId of remove) {
                const user = await User.findByPk(userId);
                if (user) {
                    await course.removeUser(user);
                }
            }
        }

        res.status(200).send();
    } catch (e) {
        next(e);
    }
});

// Fetch a CSV file containing list of the students enrolled in the Course.


// Returns a list containing the Assignment IDs of all Assignments for the Course.
router.get("/:id/assignments", rateLimitNoAuth, async function (req, res, next) {

    const courseId = req.params.id

    try {
        // Check if the course exists
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).send({ "error": "Course not found" });
        }

        const assignments = await Assignment.findAll({
            where: { courseId: courseId },
            attributes: ['id']
        })
        res.status(200).send({
            assignments: assignments
        })
    } catch (e) {
        next(e)
    }
})
module.exports = router