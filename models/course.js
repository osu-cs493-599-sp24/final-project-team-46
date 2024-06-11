const { DataTypes } = require("sequelize");
const sequelize = require("../lib/sequelize");
const { User } = require("/User"); 

const definition = {
    subject: { type: DataTypes.STRING, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false, unique: true },
    title: { type: DataTypes.STRING, allowNull: false, unique: true },
    term: { type: DataTypes.STRING, allowNull: false },
    instructorId: { type: DataTypes.INTEGER, allowNull: false } 
};

// UNFINISHED!

const Course = sequelize.define("course", definition);


// A course belongs to an instructor
Course.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });

// An instructor can teach multiple courses
User.hasMany(Course, { foreignKey: 'instructorId', as: 'courses' });

exports.Course = Course;
exports.CourseClientFields = Object.keys(definition);
