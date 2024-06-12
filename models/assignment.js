const { DataTypes } = require("sequelize");
const sequelize = require("../lib/sequelize");

const definition = {
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
};

const Assignment = sequelize.define("assignment", definition);

module.exports.Assignment = Assignment;
module.exports.AssignmentClientFields = Object.keys(definition).concat("courseId");