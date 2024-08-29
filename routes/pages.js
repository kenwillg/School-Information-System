const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");

router.get("/", (req, res) => {
  res.render("login");
});

router.get("/register", (req, res) => {
  res.render("register");
});

router.get("/login", (req, res) => {
  res.render("login");
});

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

//TEACHER
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

router.get("/data_guru", authController.protect, authController.getDataGuru);

module.exports = router;
