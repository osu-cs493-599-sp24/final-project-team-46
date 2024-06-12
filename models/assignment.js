const { DataTypes } = require("sequelize");
const sequelize = require("../lib/sequelize");
const { Course } = require("./course");

const Assignment = sequelize.define("assignment", {
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
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


module.exports = {
    Assignment,
    AssignmentClientFields: ['courseId', 'title', 'points', 'due']
};
