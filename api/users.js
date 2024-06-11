const { Router } = require('express')
const { ValidationError } = require("sequelize")

const { User, UserClientFields } = require("../models/user")
const { Course } = require("../models/course")
const { generateAuthToken, authenticate, requireAuthentication } = require("../lib/auth")
const bcrypt = require('bcryptjs')
const router = Router()


// Create and store a new application User with specified data and adds it to the application's database.
router.post("/", async function (req, res, next) {

    // Still need a 403 response for unauthenticated user to create admin/instructor
    try {
        const user = await User.create(req.body, { fields: UserClientFields })
        res.status(201).send({ id: user.id })
    } catch (e) {
        if (e instanceof ValidationError) {
            res.status(400).send({ error: e.message })
        } else {
            next(e)
        } 
        
    }
})

// Authenticate a specific User with their email address and password.
router.post("/login", async function (req, res, next) {
    const { email, password } = req.body

    // Check if email and password fields are present
    if (!email || !password) {
        return res.status(400).send({
            error: "Request body must contain 'email' and 'password' fields"
        })
    }

    try {
        // Find user by email
        const user = await User.findOne({ where: { email } })

        // Checks if user exists and password matches
        if (user && bcrypt.compareSync(password, user.password)) {
            const token = generateAuthToken(user.id)
            res.status(200).send({
                token: token
            })
        } else {
            // 401 if authentication fails
            res.status(401).send({
                error: "Invalid authentication credentials"
            })
        }

    } catch (e) {
        next(e)
    }
    

})

// Returns information about the specified User.
router.get("/:id", requireAuthentication, async function (req, res, next) {
    const id = parseInt(req.params.id)

    try {
        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] }
          })

        if (!user) {
            return res.status(404).send({ error: "User not found." })
        }
       
       /*
        * TODO still need to implement this:
        *  If the User has the 'student' role, the response should include a list of the IDs of the Courses the User is enrolled in
        */
       if (user.role === "student") {
        res.status(200).send({
            name: user.name,
            email: user.email,
            role: user.role
        })
       } else if (user.role === "instructor") {
        // If the user is an instructor, find all courses they teach
        const courseList = await Course.findAll({
            where: { instructorId: id },
            attributes: ['id']
        })
        const coursesIds = courseList.map(course => course.id);
        res.status(200).send({
            courses: coursesIds
        })
       } else {
        res.status(200).send(user)
       }
       
      
    } catch (e) {
        next(e)
    }
})

module.exports = router