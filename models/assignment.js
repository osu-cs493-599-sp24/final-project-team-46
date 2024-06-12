const { DataTypes } = require("sequelize");
const sequelize = require("../lib/sequelize");
const { Course } = require("./course");

const Assignment = sequelize.define("assignment", {
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Course,
            key: 'id'
        },
        validate: {
            async isValidCourseId(value) {
                const course = await Course.findByPk(value);
                if (!course) {
                    throw new Error("Invalid courseId. Course does not exist.");
                }
            }
        }
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    due: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            isDate: true
        }
    }
});

// Ensure the relationship between Assignment and Course
Assignment.belongsTo(Course, { foreignKey: 'courseId' });
Course.hasMany(Assignment, { foreignKey: 'courseId' });

module.exports = {
    Assignment,
    AssignmentClientFields: ['courseId', 'title', 'points', 'due']
};
