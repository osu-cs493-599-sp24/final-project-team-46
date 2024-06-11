const { Router } = require('express')
const { ValidationError } = require("sequelize")

const { User, UserClientFields } = require("../models/user")
const { generateAuthToken, authenticate, requireAuthentication } = require("../lib/auth")
const bcrypt = require('bcryptjs')
const router = Router()


// Create and store a new application User with specified data and adds it to the application's database.
router.post("/", async function (req, res) {
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

    try {
        const user = await User.findOne({ where: { email } })
        if (user && bcrypt.compareSync(password, user.password)) {
            const token = generateAuthToken(user.id)
            res.status(200).send({
                token: token
            })
        } else {
            res.status(400).send({
                error: "Invalid authentication credentials"
            })
        }

    } catch (e) {
        next(e)
    }
    

})

// 
router.get("/:id", requireAuthentication, async function (req, res, next) {
    const id = parseInt(req.params.id)

    try {
        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] }
        })

        if (!user) {
            return res.status(404).send({ error: "User not found." })
        }

        /* TODO
            if (user.role === 'instructor') {
                ...
            } else if (user.role === 'student' ) {
                ... 
            }
        */
       // Ideally we send information based on the role of the user, but Courses has not been implemented yet
       // Just sends response of information of user for now
       res.status(200).send(user)
    } catch (e) {
        next(e)
    }
})

module.exports = router