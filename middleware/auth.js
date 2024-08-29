// // controllers/auth.js

// const jwt = require("jsonwebtoken");
// const db = require("../database/databaseConfig");

// exports.protect = (req, res, next) => {
//   const token = req.cookies.jwt;

//   if (!token) {
//     // If no token is found, redirect to the login page
//     return res.status(401).redirect("/login");
//   }

//   jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//     if (err) {
//       // If token verification fails, redirect to the login page
//       return res.status(401).redirect("/login");
//     }

//     db.query(
//       "SELECT * FROM users WHERE id = ?",
//       [decoded.id],
//       (error, results) => {
//         if (error || results.length === 0) {
//           // If user not found, redirect to the login page
//           return res.status(401).redirect("/login");
//         }

//         req.user = results[0];
//         next();
//       }
//     );
//   });
// };
