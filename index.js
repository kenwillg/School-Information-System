const express = require("express");
const hbs = require("hbs");
const mysql = require("mysql2");
const path = require("path");
const cookieParser = require("cookie-parser");
const db = require("./database/databaseConfig");
const dotenv = require("dotenv");

const app = express();
const PORT = 9090;

app.use(express.static("public"));
app.use(cookieParser()); // Add cookie parser middleware

// Set the view engine to hbs
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Middleware for parsing JSON and urlencoded data and cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Views Routes
app.use("/", require("./routes/pages"));
app.use("/auth", require("./routes/auth"));

hbs.registerHelper("calculateRemedial", function (nilai_kuis) {
  return nilai_kuis >= 65 ? "No Remedial" : "Remedial";
});
hbs.registerHelper("ifEquals", function (arg1, arg2, options) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});

app.get("/test", (req, res) => {
  const testUser = {
    nama: "Test User",
    kode_ruang_kelas: "Test Class",
  };
  res.render("studentDashboard", { user: testUser });
});

app.listen(PORT, () =>
  console.log("[SERVER] Server has successfully running on PORT " + PORT)
);
