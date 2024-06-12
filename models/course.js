const { DataTypes } = require("sequelize");
const sequelize = require("../lib/sequelize");
// const { User } = require("./user"); 
// const { Assignment } = require("./assignment")

const definition = {
    subject: { type: DataTypes.STRING, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    term: { type: DataTypes.STRING, allowNull: false },
    instructorId: { type: DataTypes.INTEGER, allowNull: false } 
};


const Course = sequelize.define("course", definition);


exports.Course = Course;
exports.CourseClientFields = Object.keys(definition);
