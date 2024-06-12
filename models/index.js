const { sequelize } = require("../lib/sequelize");
const { User } = require("./user");
const { Course } = require("./course");
const { Assignment } = require("./assignment");
const { Submission } = require("./submission");



// // Submission Relationships

// Submission.belongsTo(Assignment, { foreignKey: 'assignmentId' });
// Assignment.hasMany(Submission, { foreignKey: 'assignmentId' });

// Submission.belongsTo(User, { foreignKey: 'studentId' });
// User.hasMany(Submission, { foreignKey: 'studentId' });

function buildAssociations() {
    // Assignment relationships:

    Assignment.belongsTo(Course, { foreignKey: 'courseId' });
    Course.hasMany(Assignment, { foreignKey: 'courseId' });

    // Course Relationships:

    Course.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });
    User.hasMany(Course, { foreignKey: 'instructorId', as: 'courses' });
}

module.exports = buildAssociations