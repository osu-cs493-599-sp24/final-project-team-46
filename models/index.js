const { User } = require("./user");
const { Course } = require("./course");
const { Assignment } = require("./assignment");
const { Submission } = require("./submission");

function buildAssociations() {
    console.log("== Building SQL Relationships");
    User.hasMany(Submission, { foreignKey: "studentId", allowNull: false });
    Submission.belongsTo(User, { foreignKey: "studentId", allowNull: false });

    Assignment.hasMany(Submission, { foreignKey: "assignmentId", allowNull: false });
    Submission.belongsTo(Assignment, { foreignKey: "assignmentId", allowNull: false });

    Course.hasMany(Assignment, { foreignKey: "courseId", allowNull: false });
    Assignment.belongsTo(Course, { foreignKey: "courseId", allowNull: false });

    User.belongsToMany(Course, { through: "CourseEnrollments" });
    Course.belongsToMany(User, { through: "CourseEnrollments" });
}

module.exports = buildAssociations;