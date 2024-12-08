const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const SECRET_KEY = "your_secret_key";

// Verbind met MongoDB
mongoose.connect("mongodb://localhost:27017/sneakerstore")
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Failed to connect to MongoDB:", err));


// Definieer User Schema en Model
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);

// Definieer Order Schema en Model
const OrderSchema = new mongoose.Schema({
  customerName: String,
  email: String,
  address: String,
  configuration: Object, // Productconfiguratie (zoals kleur, maat, enz.)
  status: { type: String, default: "new" }, // Status van de bestelling
  createdAt: { type: Date, default: Date.now },
});
const Order = mongoose.model("Order", OrderSchema);

// Voeg standaard admin-gebruiker toe bij het opstarten van de server
const addAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ username: "admin@admin.com" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("Admin", 10);
      const adminUser = new User({ username: "admin@admin.com", password: hashedPassword });
      await adminUser.save();
      console.log("Admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Failed to create admin user:", error);
  }
};
addAdminUser();

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: "1h" });
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Failed to log in" });
  }
});

// Beschermde endpoint om toegang te testen
app.get('/api/protected', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Token required" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    res.status(200).json({ message: "Access granted", user: decoded });
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
});

// Voeg een bestelling toe
app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, email, address, configuration } = req.body;
    const newOrder = new Order({ customerName, email, address, configuration });
    await newOrder.save();
    res.status(201).json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
    res.status(500).json({ message: "Failed to create order", error });
  }
});

// Haal alle bestellingen op
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders", error });
  }
});



// Start de server
app.listen(3000, () => {
  console.log('API running on http://localhost:3000');
});

