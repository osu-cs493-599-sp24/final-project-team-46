const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../lib/sequelize");

const definition = {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        set(value) {
            this.setDataValue("password", bcrypt.hashSync(value, 8));
        },
        role: { type: DataTypes.ENUM("student", "instructor", "admin"), allowNull: false, defaultValue: "student "}
    }
};

exports.User = User;
exports.UserClientFields = Object.keys(definition);