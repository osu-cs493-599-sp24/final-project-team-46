const { DataTypes } = require("sequelize");
const sequelize = require("../lib/sequelize");

const definition = {
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    grade: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    file: {
        type: DataTypes.STRING,
        allowNull: false
    }
}

const Submission = sequelize.define("submission", definition);

module.exports.Submission = Submission;
module.exports.SubmissionClientFields = Object.keys(definition).concat("studentId", "assignmentId");
