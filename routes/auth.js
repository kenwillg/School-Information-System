const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");

// Login route
router.post("/login", authController.login);

// Logout route
router.get("/logout", authController.logout);

// Protected route (example)
router.get("/protected-route", authController.protect, (req, res) => {
  res.send("This is a protected route");
});

// Dashboard route
// routes/auth.js
router.get(
  "/dashboard",
  authController.protectRoute,
  (req, res, next) => {
    if (req.user.role_id === 1) {
      authController.getStudentGrades(req, res, next);
    } else {
      next();
    }
  },
  (req, res, next) => {
    if (req.user.role_id === 1) {
      authController.getTodaySchedule(req, res, next);
    } else if (req.user.role_id === 2) {
      authController.getTodayScheduleForTeacher(req, res, next);
    } else {
      next();
    }
  },
  (req, res) => {
    const user = req.user;
    if (!user) {
      return res.redirect("/login");
    }
    console.log("currently logged in is: ", user);

    if (user.role_id === 1) {
      res.render("studentDashboard", {
        user,
        jadwal_pelajaran: req.schedule,
        studentGrades: req.studentGrades,
      });
    } else if (user.role_id === 2) {
      res.render("teacherDashboard", {
        user,
        jadwal_pelajaran: req.schedule,
        studentGrades: [], // Adjust this as needed if you fetch grades for teachers
      });
    } else {
      res.render("otherDashboard", { user });
    }
  }
);
// Route for the test route
router.get("/test", (req, res) => {
  // This route is for testing purposes
  // You can use it to render the dashboard with test user data
  const testUser = {
    nama: "Test User",
    kode_ruang_kelas: "Test Class",
  };
  res.render("studentDashboard", { user: testUser });
});

// Routes for students
router.get(
  "/student/jadwal_pelajaran",
  authController.protectRoute,
  authController.restrictTo(1),
  authController.getWeeklySchedule,
  (req, res) => {
    res.render("studentJadwalPelajaran", {
      weeklySchedule: req.weeklySchedule,
    });
  }
);

router.get(
  "/student/nilai_semester",
  authController.protectRoute,
  authController.restrictTo(1),
  authController.getStudentGrades,
  (req, res) => {
    res.render("studentNilaiSemester", {
      studentGrades: req.studentGrades,
    });
  }
);

router.get(
  "/student/ekstrakurikuler",
  authController.protectRoute,
  authController.restrictTo(1),
  authController.getStudentExtracurricular,
  (req, res) => {
    res.render("studentEkstrakurikuler", {
      myEkstrakurikuler: req.myEkstrakurikuler,
      availableEkstrakurikuler: req.availableEkstrakurikuler,
    });
  }
);

// Routes to add and remove extracurricular activities
router.post(
  "/student/ekstrakurikuler/add",
  authController.protectRoute,
  authController.restrictTo(1),
  authController.addExtracurricular
);

router.post(
  "/student/ekstrakurikuler/remove",
  authController.protectRoute,
  authController.restrictTo(1),
  authController.removeExtracurricular
);

// Routes for teachers
router.get(
  "/teacher/jadwal_pelajaran",
  authController.protectRoute,
  authController.restrictTo(2),
  (req, res) => {
    res.render("teacherJadwalPelajaran");
  }
);

router.get(
  "/teacher/nilai_semester",
  authController.protectRoute,
  authController.restrictTo(2), // Assuming role_id 2 is for teachers
  authController.getAllStudentGrades,
  (req, res) => {
    res.render("teacherNilaiSemester", {
      studentGrades: req.studentGrades,
    });
  }
);

router.post(
  "/teacher/nilai_semester/update",
  authController.protectRoute,
  authController.restrictTo(2), // Assuming role_id 2 is for teachers
  authController.getAllStudentGrades, // Populate req.studentGrades
  authController.updateStudentGrades // Update student grades
);

router.get(
  "/teacher/ekstrakurikuler",
  authController.protectRoute,
  authController.restrictTo(2),
  (req, res) => {
    res.render("teacherEkstrakurikuler");
  }
);

// Routes for both students and teachers
router.get("/data_guru", authController.protect, authController.getDataGuru);

module.exports = router;
