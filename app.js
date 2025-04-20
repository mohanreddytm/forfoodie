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

app.get("/products/:category", async (request, response) => {

  const {category} = request.params;
  

  try {
    const result = await pool.query('SELECT * FROM public."Product" where category=$1;', [category]); 
    console.log(result.rows);
    response.json(result.rows);
  } catch (error) {
    console.error("GET Error:", error);
    response.status(500).send("Server error");
  }
})

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

app.post("/cart/", async (request, response) => {
  const { name, price, quantity, userId } = request.body;

  try {
    // Check if item already exists for the user
    const checkQuery = 'SELECT quantity FROM "cart" WHERE name = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [name, userId]);

    if (checkResult.rows.length > 0) {
      // Item exists, update the quantity
      const existingQuantity = checkResult.rows[0].quantity;
      const newQuantity = existingQuantity + quantity;

      await pool.query(
        'UPDATE "cart" SET quantity = $1 WHERE name = $2 AND user_id = $3',
        [newQuantity, name, userId]
      );

      response.send("Cart quantity updated");
    } else {
      // Item doesn't exist, insert it
      await pool.query(
        'INSERT INTO "cart" (name, price, quantity, user_id) VALUES ($1, $2, $3, $4)',
        [name, price, quantity, userId]
      );

      response.send("Successfully added to cart");
    }
  } catch (error) {
    console.error("POST Error:", error);
    response.status(500).send("Server error");
  }
});


app.delete("/cart", async (req, res) => {
  const { id, userId } = req.body;

  try {
    await pool.query(
      'DELETE FROM "cart" WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.send("Cart item deleted");
  } catch (error) {
    console.error("DELETE Error:", error);
    res.status(500).send("Server error");
  }
});

app.post("/orders", async (req, res) => {
  const { userId, buyerName, buyerContact, deliveryAddress, amount, status } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO "Order" (user_id, buyer_name, buyer_contact, delivery_address, amount, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, buyerName, buyerContact, deliveryAddress, amount, status]
    );

    res.status(201).json({ message: "Order placed successfully", order: result.rows[0] });
  } catch (error) {
    console.error("POST /orders Error:", error);
    res.status(500).send("Failed to place order");
  }
});




app.delete("/cart/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    await pool.query(
      `DELETE FROM "cart" WHERE user_id = $1`,
      [userId]
    );

    res.send("All cart items deleted for user");
  } catch (error) {
    console.error("DELETE /cart/:userId Error:", error);
    res.status(500).send("Server error");
  }
});


app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      `DELETE FROM "Product" WHERE id = $1`,
      [id]
    );

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("DELETE /products/:id Error:", error);
    res.status(500).send("Server error");
  }
});


app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM "Admin" WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).send("Invalid email");
    }

    const dbAdmin = result.rows[0];
    const isValid = await bcrypt.compare(password, dbAdmin.password);

    if (!isValid) {
      return res.status(400).send("Invalid password");
    }

    const payload = { adminId: dbAdmin.id, email: dbAdmin.email };
    const jwtToken = jwt.sign(payload, "ADMIN_SECRET", { expiresIn: "30d" });

    res.json({ jwtToken });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).send("Server error");
  }
});

app.get("/orders/" , async (req , res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM "Order";`
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("GET /orders/:userId Error:", error);
    res.status(500).send("Server error");
  }
})


app.get("/orders/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM "Order" WHERE user_id = $1 ORDER BY id DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("GET /orders/:userId Error:", error);
    res.status(500).send("Server error");
  }
});

app.delete("/orders", async (req, res) => {
  const { id, userId } = req.body;

  try {
    const result = await pool.query(
      `DELETE FROM "Order" WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.status(200).json("Order has been deleted");
  } catch (error) {
    console.error("DELETE /orders Error:", error);
    res.status(500).send("Server error");
  }
});




app.get("/cart/:userId", async(request, response) => {
  const {userId} = request.params
  try {
    const result = await pool.query(
      'select * from "cart" where user_id = $1',
      [userId]
    );
    console.log(result.rows);
    response.json(result.rows);
  } catch (error) {
    console.error("GET Error:", error);
    response.status(500).send("Server error");
  }
})

app.get("/products/:category/:subcategory", async (request, response) => {
  const { category, subcategory } = request.params;
  const decodedSearch = decodeURIComponent(subcategory);

  try {
    const result = await pool.query(
      'select * from "Product" where category = $1 and subCategory = $2',
      [category, decodedSearch]
    );
    console.log(result.rows);
    response.json(result.rows);
  } catch (error) {
    console.error("GET Error:", error);
    response.status(500).send("Server error");
  }
}
)

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


    const payload = {username: email, userId: usersId, name: name, contact: contact};
    
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

    const { id: userId, name, contact } = dbUser;
    const payload = { username: email, userId, name, contact };
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