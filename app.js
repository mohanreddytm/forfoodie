const express = require("express");
const cors = require("cors");
require("dotenv").config();

const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 5050;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get("/users/", async (request, response) => {
  console.log("entered get users");
  try {
    const result = await pool.query('SELECT * FROM public."User";'); 
    console.log(result.rows);
    response.json(result.rows);
  } catch (error) {
    console.error("GET Error:", error);
    response.status(500).send("Server error");
  }
});

app.get("/products/" , async (request, response) => {
  try {
    const result = await pool.query('SELECT * FROM public."Product";'); 
    console.log(result.rows);
    response.json(result.rows);
  } catch (error) {
    console.error("GET Error:", error);
    response.status(500).send("Server error");
  }
});

app.post("/users/", async (request, response) => {
  const { name, contact, email, password } = request.body;

  console.log(name, contact, email, password);
  
  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT * FROM "User" WHERE email = $1;',
      [email]
    );

    if (userCheck.rows.length > 0) {
      return response.status(400).send("User already exists");
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO "User" (name,contact, email, password) VALUES ($1, $2, $3, $4);',
      [name,contact, email, hashedPassword]
    );

    const result = await pool.query('SELECT * FROM public."User" WHERE email = $1;', [email]);
    const usersId = (result.rows[0].id);


    const payload = {username: email, userId: usersId};
    
    const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN", { expiresIn: "30d" });
    response.json({ jwtToken });
  } catch (error) {
    console.error("POST Error:", error);
    response.status(500).send("Registration failed");
  }
});

// User login
app.post("/login/", async (request, response) => {
  const { email, password } = request.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM "User" WHERE email = $1;',
      [email]
    );
    
    if (result.rows.length === 0) {
      return response.status(400).send("Invalid user");
    }

    const dbUser = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);
    
    if (!isPasswordValid) {
      return response.status(400).send("Invalid password");
    }

    const payload = {username: dbUser.email,userId: dbUser.id,};
    const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN", { expiresIn: "30d" });
    response.json({ jwtToken });
    
  } catch (error) {
    console.error("Login Error:", error);
    response.status(500).send("Login failed");
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;