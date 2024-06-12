const { Router } = require('express')
const { ValidationError } = require("sequelize")
const { User } = require("../models/user")
const { Course } = require("../models/course")
const { Assignment } = require("../models/assignment")
const { Submission, SubmissionClientFields } = require("../models/submission")

const router = Router()





module.exports = router