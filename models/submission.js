const { DataTypes } = require("sequelize");
const sequelize = require("../lib/sequelize");

const Submission = sequelize.define("submission", {
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
});

module.exports = { Submission };
exports.SubmissionClientFields = Object.keys("submission");
