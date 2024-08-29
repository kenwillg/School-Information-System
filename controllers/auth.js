const jwt = require("jsonwebtoken");
const db = require("../database/databaseConfig");

// Load environment variables from .env file
require("dotenv").config();

exports.login = (req, res) => {
  const { email, password } = req.body;

  // Query to find the user by email
  db.query("SELECT * FROM users WHERE email = ?", [email], (error, results) => {
    if (error) {
      console.log(error);
      return res.status(500).send("Server error");
    }

    // If user not found or password doesn't match
    if (results.length === 0 || results[0].password !== password) {
      return res.render("login", {
        message: "Email or Password is incorrect",
      });
    }

    // If login successful
    const user = results[0];
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      }
    );

    console.log("The token is: " + token);

    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    };

    res.cookie("jwt", token, cookieOptions);

    console.log(user.id);

    // Redirect all users to the dashboard after login
    res.redirect("/dashboard");
  });
};

exports.protect = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    // If no token is found, redirect to the login page
    return res.status(401).redirect("/login");
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // If token verification fails, redirect to the login page
      return res.status(401).redirect("/login");
    }

    db.query(
      "SELECT * FROM users WHERE id = ?",
      [decoded.id],
      (error, results) => {
        if (error || results.length === 0) {
          // If user not found, redirect to the login page
          return res.status(401).redirect("/login");
        }

        req.user = results[0];
        next();
      }
    );
  });
};

exports.protectRoute = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.redirect("/login");
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.redirect("/login");
    }

    const userId = decoded.id;

    const query = `
      SELECT users.*, siswa.nama, ruang_kelas.kode_ruang_kelas 
      FROM users 
      LEFT JOIN siswa ON users.id = siswa.user_id 
      LEFT JOIN ruang_kelas ON siswa.ruang_kelas_id = ruang_kelas.id 
      WHERE users.id = ?`;

    db.query(query, [userId], (error, results) => {
      if (error || results.length === 0) {
        return res.redirect("/login");
      }

      req.user = results[0];

      if (req.originalUrl.startsWith("/student/") && req.user.role_id !== 1) {
        return res.redirect("/dashboard");
      } else if (
        req.originalUrl.startsWith("/teacher/") &&
        req.user.role_id !== 2
      ) {
        return res.redirect("/dashboard");
      }

      next();
    });
  });
};

exports.getDataGuru = (req, res) => {
  const query = `
    SELECT g.*, GROUP_CONCAT(mp.nama_mapel SEPARATOR ', ') AS mata_pelajaran
    FROM guru g
    LEFT JOIN mata_pelajaran mp ON FIND_IN_SET(g.id, mp.guru_ids)
    GROUP BY g.id;
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Server error");
    }

    res.render("dataGuru", {
      title: "Data Guru",
      gurus: results,
    });
  });
};

exports.getStudentGrades = (req, res, next) => {
  const studentId = req.user.id;

  const query = `
    SELECT 
    sam.jadwal_mapel_id,
    mp.nama_mapel,
    MAX(sam.nilai_tugas) AS nilai_tugas,
    MAX(sam.nilai_kuis) AS nilai_kuis,
    MAX(sam.nilai_uts) AS nilai_uts,
    MAX(sam.nilai_uas) AS nilai_uas
  FROM 
    siswa_ambil_mapel sam
  JOIN 
    mata_pelajaran mp ON sam.jadwal_mapel_id = mp.id
  WHERE 
    sam.siswa_id = ?
  GROUP BY 
    sam.jadwal_mapel_id, mp.nama_mapel;
      `;

  db.query(query, [studentId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Server error");
    }

    req.studentGrades = results; // Store student grades in the request object
    next(); // Proceed to the next middleware
  });
};

exports.getAllStudentGrades = (req, res, next) => {
  const query = `
    SELECT DISTINCT
      s.id AS siswa_id,
      sam.jadwal_mapel_id,
      s.nama AS nama_siswa,
      sam.nilai_tugas,
      sam.nilai_kuis,
      sam.nilai_uts,
      sam.nilai_uas,
      mp.nama_mapel,
      rk.kode_ruang_kelas
    FROM
      siswa_ambil_mapel sam
    JOIN
      siswa s ON sam.siswa_id = s.id
    JOIN
      jadwal_mapel jm ON sam.jadwal_mapel_id = jm.id
    JOIN
      mata_pelajaran mp ON jm.mata_pelajaran_id = mp.id
    JOIN
      ruang_kelas rk ON s.ruang_kelas_id = rk.id
    WHERE
      jm.guru_id = ?;
  `;

  db.query(query, [req.user.id], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Server error");
    }

    req.studentGrades = results; // Store all student grades in the request object
    next(); // Proceed to the next middleware
  });
};

exports.updateStudentGrades = (req, res) => {
  const updates = [];

  for (const key in req.body) {
    if (req.body.hasOwnProperty(key)) {
      const [type, index] = key.split("_");
      const value = req.body[key];
      updates.push({ type, index, value });
    }
  }

  const queries = updates.map((update) => {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE siswa_ambil_mapel 
        SET nilai_${update.type} = ? 
        WHERE siswa_id = ? AND jadwal_mapel_id = ?;
      `;
      const { siswa_id, jadwal_mapel_id } = req.studentGrades[update.index];
      console.log(
        `Executing query: ${query} with values: ${update.value}, ${siswa_id}, ${jadwal_mapel_id}`
      );

      db.query(
        query,
        [update.value, siswa_id, jadwal_mapel_id],
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        }
      );
    });
  });

  Promise.all(queries)
    .then(() => res.redirect("/teacher/nilai_semester"))
    .catch((error) => {
      console.error("Error updating student grades:", error);
      res.status(500).send("Error updating student grades");
    });
};

exports.getTodaySchedule = (req, res) => {
  const siswaId = req.user.id;

  const scheduleQuery = `
    SELECT DISTINCT
        m.nama_mapel, 
        jm.hari_id, 
        jm.jam_mulai, 
        jm.jam_akhir, 
        g.nama as guru_nama
    FROM 
        siswa_ambil_mapel sam
    JOIN 
        jadwal_mapel jm ON sam.jadwal_mapel_id = jm.id
    JOIN 
        mata_pelajaran m ON jm.mata_pelajaran_id = m.id
    JOIN 
        guru g ON jm.guru_id = g.id
    WHERE 
        sam.siswa_id = ? AND jm.hari_id = DAYOFWEEK(CURRENT_DATE) - 1;
  `;

  db.query(scheduleQuery, [siswaId], (scheduleError, scheduleResults) => {
    if (scheduleError) {
      console.error(scheduleError);
      return res.status(500).send("Server error");
    }

    res.render("studentDashboard", {
      user: req.user,
      jadwal_pelajaran: scheduleResults,
      studentGrades: req.studentGrades, // Pass student grades to the template
    });
  });
};

exports.getWeeklySchedule = (req, res, next) => {
  const siswaId = req.user.id;

  console.log("getWeeklySchedule called for siswaId:", siswaId);

  const scheduleQuery = `
    SELECT 
        m.nama_mapel, 
        jm.hari_id, 
        jm.jam_mulai, 
        jm.jam_akhir, 
        g.nama as guru_nama
    FROM 
        siswa_ambil_mapel sam
    JOIN 
        jadwal_mapel jm ON sam.jadwal_mapel_id = jm.id
    JOIN 
        mata_pelajaran m ON jm.mata_pelajaran_id = m.id
    JOIN 
        guru g ON jm.guru_id = g.id
    WHERE 
        sam.siswa_id = ?;
  `;

  db.query(scheduleQuery, [siswaId], (scheduleError, scheduleResults) => {
    if (scheduleError) {
      console.error("Error executing schedule query:", scheduleError);
      return res.status(500).send("Server error");
    }

    console.log("Schedule Results:", scheduleResults); // Log to confirm data retrieval

    if (scheduleResults.length === 0) {
      console.log("No schedule results found for siswaId:", siswaId);
      return res.status(404).send("No schedule found");
    }

    const timetableSlots = [
      "07:00 - 08:30",
      "08:30 - 10:00",
      "10:30 - 12:00",
      "12:00 - 13:30",
      "14:00 - 15:30",
      "15:30 - 17:00",
      "17:00 - 18:30",
    ];

    const groupedSchedule = {};

    for (let day = 1; day <= 5; day++) {
      groupedSchedule[day] = {};
      timetableSlots.forEach((slot) => {
        groupedSchedule[day][slot] = null;
      });
    }

    scheduleResults.forEach((schedule) => {
      const day = schedule.hari_id;
      const timeSlot = `${schedule.jam_mulai} - ${schedule.jam_akhir}`;
      if (groupedSchedule[day] && groupedSchedule[day][timeSlot] === null) {
        groupedSchedule[day][timeSlot] = schedule;
      }
    });

    req.weeklySchedule = groupedSchedule;
    console.log("Grouped Schedule:", groupedSchedule); // Log to confirm data processing

    next();
  });
};

exports.getTodayScheduleForTeacher = (req, res) => {
  const teacherId = req.user.id;

  const scheduleQuery = `
    SELECT DISTINCT
        m.nama_mapel, 
        jm.hari_id, 
        jm.jam_mulai, 
        jm.jam_akhir
    FROM 
        jadwal_mapel jm
    JOIN 
        mata_pelajaran m ON jm.mata_pelajaran_id = m.id
    WHERE 
        jm.guru_id = ? AND jm.hari_id = DAYOFWEEK(CURRENT_DATE) - 1;
  `;

  db.query(scheduleQuery, [teacherId], (scheduleError, scheduleResults) => {
    if (scheduleError) {
      console.error(scheduleError);
      return res.status(500).send("Server error");
    }

    res.render("teacherDashboard", {
      user: req.user,
      jadwal_pelajaran: scheduleResults,
    });
  });
};

exports.getStudentExtracurricular = (req, res, next) => {
  const studentId = req.user.id;

  // Query to get student's enrolled extracurricular activities
  const myEkstrakurikulerQuery = `
    SELECT 
      e.id,
      e.nama, 
      h.nama_hari, 
      g.nama as guru_nama, 
      rk.kode_ruang_kelas, 
      e.semester_id, 
      se.nilai,
      rk.kapasitas_ruang as maxAnggota,
      (SELECT COUNT(*) FROM siswa_ambil_ekskul se WHERE se.ekskul_id = e.id) as anggota
    FROM 
      ekstrakurikuler e
    JOIN 
      siswa_ambil_ekskul se ON e.id = se.ekskul_id
    JOIN 
      guru g ON e.guru_id = g.id
    JOIN 
      ruang_kelas rk ON e.ruang_kelas_id = rk.id
    JOIN 
      hari h ON e.hari_id = h.id
    WHERE 
      se.siswa_id = ?;
  `;

  db.query(
    myEkstrakurikulerQuery,
    [studentId],
    (error, myEkstrakurikulerResults) => {
      if (error) {
        console.error(error);
        return res.status(500).send("Server error");
      }

      // Query to get all available extracurricular activities excluding those the student has already joined
      const availableEkstrakurikulerQuery = `
      SELECT 
        e.id,
        e.nama, 
        h.nama_hari, 
        g.nama as guru_nama, 
        rk.kode_ruang_kelas,
        rk.kapasitas_ruang as maxAnggota,
        (SELECT COUNT(*) FROM siswa_ambil_ekskul se WHERE se.ekskul_id = e.id) as anggota,
        CASE
          WHEN (SELECT COUNT(*) FROM siswa_ambil_ekskul se WHERE se.ekskul_id = e.id) >= rk.kapasitas_ruang THEN 1
          ELSE 0
        END as anggotaFull
      FROM 
        ekstrakurikuler e
      JOIN 
        guru g ON e.guru_id = g.id
      JOIN 
        ruang_kelas rk ON e.ruang_kelas_id = rk.id
      JOIN 
        hari h ON e.hari_id = h.id
      WHERE 
        e.id NOT IN (
          SELECT se.ekskul_id 
          FROM siswa_ambil_ekskul se 
          WHERE se.siswa_id = ?
        );
    `;

      db.query(
        availableEkstrakurikulerQuery,
        [studentId],
        (error, availableEkstrakurikulerResults) => {
          if (error) {
            console.error(error);
            return res.status(500).send("Server error");
          }

          req.myEkstrakurikuler = myEkstrakurikulerResults;
          req.availableEkstrakurikuler = availableEkstrakurikulerResults;
          next();
        }
      );
    }
  );
};

exports.addExtracurricular = (req, res) => {
  const studentId = req.user.id;
  const { ekskulId } = req.body;

  const insertQuery = `INSERT INTO siswa_ambil_ekskul (siswa_id, ekskul_id, nilai) VALUES (?, ?, NULL)`;
  db.query(insertQuery, [studentId, ekskulId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Server error");
    }
    res.redirect("/student/ekstrakurikuler");
  });
};

exports.removeExtracurricular = (req, res) => {
  const studentId = req.user.id;
  const { ekskulId } = req.body;

  const deleteQuery = `DELETE FROM siswa_ambil_ekskul WHERE siswa_id = ? AND ekskul_id = ?`;
  db.query(deleteQuery, [studentId, ekskulId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Server error");
    }
    res.redirect("/student/ekstrakurikuler");
  });
};

exports.restrictTo = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role_id !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

exports.logout = (req, res) => {
  res.clearCookie("jwt");
  res.redirect("/login");
};
