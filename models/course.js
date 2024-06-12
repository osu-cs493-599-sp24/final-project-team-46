const { DataTypes } = require("sequelize");
const sequelize = require("../lib/sequelize");

const definition = {
    subject: { type: DataTypes.STRING, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    term: { type: DataTypes.STRING, allowNull: false }
};

const Course = sequelize.define("course", definition);

module.exports.Course = Course;
module.exports.CourseClientFields = Object.keys(definition).concat("instructorId");
