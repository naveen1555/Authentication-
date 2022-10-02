const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const bcrypt = require("bcrypt");
const databasePath = path.join(__dirname, "userData.db");
const app = express();
app.use(express.json());
let database = null;

const initializeConnectionWithDbToServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`Db Error: ${error.message}`);
    process.exit(1);
  }
};

initializeConnectionWithDbToServer();

//Create User API

const checkPasswordLength = (password) => {
  return password.length > 4;
};

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const checkUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await database.get(checkUserQuery);

  if (dbUser === undefined) {
    const createUserDetailsQuery = `
      INSERT INTO
        user (username,name,password,gender,location)
      VALUES(
          '${username}',
          '${name}',
          '${hashedPassword}',
          '${gender}',
          '${location}');`;
    if (checkPasswordLength(password)) {
      await database.run(createUserDetailsQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// User Login API

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const checkingUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(checkingUserQuery);

  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const compareGivenPassword = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (compareGivenPassword) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Change Password API

const validatePassword = (password) => {
  return password.length > 4;
};

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkUserNameQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const isUserExist = await database.get(checkUserNameQuery);
  if (isUserExist === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const checkOldPassword = await bcrypt.compare(
      oldPassword,
      isUserExist.password
    );
    if (checkOldPassword === true) {
      if (validatePassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
        UPDATE
          user
        SET
          password = '${hashedPassword}'
        WHERE
          username = '${username}';`;

        const newUser = await database.run(updatePasswordQuery);

        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
