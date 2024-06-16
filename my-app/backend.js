const express = require("express");
const bodyparser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = 5000;

app.use(bodyparser.json());
app.use(cors());

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "users",
});

connection.connect((err) => {
    if (err) {
        console.error("Error connecting to MySQL:", err);
    } else {
        console.log("Connected to the database");
    }
});

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send({ error: "Email and password are required" });
    }

    const query = "SELECT * FROM user WHERE email = ? AND password = ?";
    connection.query(query, [email, password], (err, results) => {
        if (err) {
            console.error("Error querying MySQL:", err);
            return res.status(500).send({ error: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(401).send({ error: "Invalid email or password" });
        }

        const user = results[0];
        res.send({ message: "Login successful", user });
    });
});

app.post("/register", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send({ error: "Email and password are required" });
    }

    const checkUserQuery = "SELECT * FROM user WHERE email = ?";
    connection.query(checkUserQuery, [email], (err, results) => {
        if (err) {
            console.error("Error querying MySQL:", err);
            return res.status(500).send({ error: "Internal server error" });
        }

        if (results.length > 0) {
            return res.status(400).send({ error: "User already exists" });
        }

        const insertUserQuery = "INSERT INTO user (email, password) VALUES (?, ?)";
        connection.query(insertUserQuery, [email, password], (err, result) => {
            if (err) {
                console.error("Error inserting into MySQL:", err);
                return res.status(500).send({ error: "Internal server error" });
            }

            res.send({ message: "User registered successfully", userId: result.insertId });
        });
    });
});

app.post("/complaints", (req, res) => {
    const { userId, description } = req.body;
    if (!userId || !description) {
        return res.status(400).send({ error: "User ID and description are required" });
    }

    const query = "INSERT INTO complaints (user_id, description) VALUES (?, ?)";
    connection.query(query, [userId, description], (err, result) => {
        if (err) {
            return res.status(500).send({ error: "Internal server error" });
        }
        res.send({ id: result.insertId });
    });
});

app.get("/complaints", (req, res) => {
    const { isAdmin } = req.query; // Assumes admin check is done on the frontend
    if (isAdmin !== 'true') return res.status(403).send({ error: "Unauthorized" });

    const query = "SELECT * FROM complaints";
    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).send({ error: "Internal server error" });
        }
        res.send(results);
    });
});

app.put("/complaints/:id/assign", (req, res) => {
    const { isAdmin, technicianId } = req.body; // Assumes admin check is done on the frontend
    const complaintId = req.params.id;
    if (isAdmin !== true) return res.status(403).send({ error: "Unauthorized" });

    const query = "UPDATE complaints SET technician_id = ?, status = 'assigned' WHERE id = ?";
    connection.query(query, [technicianId, complaintId], (err) => {
        if (err) {
            return res.status(500).send({ error: "Internal server error" });
        }
        res.send({ message: "Technician assigned successfully" });
    });
});

app.put("/complaints/:id/resolve", (req, res) => {
    const { isTechnician, resolutionPhoto } = req.body; // Assumes technician check is done on the frontend
    const complaintId = req.params.id;
    if (!isTechnician) return res.status(403).send({ error: "Unauthorized" });

    const query = "UPDATE complaints SET resolution_photo = ?, status = 'resolved' WHERE id = ?";
    connection.query(query, [resolutionPhoto, complaintId], (err) => {
        if (err) {
            return res.status(500).send({ error: "Internal server error" });
        }
        res.send({ message: "Complaint resolved successfully" });
    });
});

app.put("/complaints/:id/approve", (req, res) => {
    const { isAdmin } = req.body; // Assumes admin check is done on the frontend
    const complaintId = req.params.id;
    if (!isAdmin) return res.status(403).send({ error: "Unauthorized" });

    const query = "UPDATE complaints SET status = 'approved' WHERE id = ?";
    connection.query(query, [complaintId], (err) => {
        if (err) {
            return res.status(500).send({ error: "Internal server error" });
        }
        res.send({ message: "Complaint approved successfully" });
    });
});

app.get("/technicians", (req, res) => {
    const query = "SELECT id, email FROM user WHERE isTechnician = 1";
    connection.query(query, (err, results) => {
        if (err) {
            console.error("Error querying MySQL:", err);
            return res.status(500).send({ error: "Internal server error" });
        }
        res.send(results);
    });
});

app.get("/technician/complaints", (req, res) => {
    const { technicianId } = req.query; // Assumes technician check is done on the frontend
    const query = "SELECT * FROM complaints WHERE technician_id = ?";
    connection.query(query, [technicianId], (err, results) => {
        if (err) {
            return res.status(500).send({ error: "Internal server error" });
        }
        res.send(results);
    });
});

app.get("/user/complaints", (req, res) => {
    const { userId } = req.query; // Assumes user ID is passed from the frontend
    const query = "SELECT * FROM complaints WHERE user_id = ?";
    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Error querying MySQL:", err);
            return res.status(500).send({ error: "Internal server error" });
        }
        res.send(results);
    });
});

app.get("/admin/resolved-complaints", (req, res) => {
    const { isAdmin } = req.query; // Assumes admin check is done on the frontend
    if (isAdmin !== 'true') return res.status(403).send({ error: "Unauthorized" });

    const query = "SELECT * FROM complaints WHERE status = 'resolved'";
    connection.query(query, (err, results) => {
        if (err) {
            console.error("Error querying MySQL:", err);
            return res.status(500).send({ error: "Internal server error" });
        }
        res.send(results);
    });
});

app.get("/technician/resolved-complaints", (req, res) => {
    const { technicianId } = req.query; // Assumes technician check is done on the frontend
    const query = "SELECT * FROM complaints WHERE status = 'resolved' AND technician_id = ?";
    connection.query(query, [technicianId], (err, results) => {
        if (err) {
            console.error("Error querying MySQL:", err);
            return res.status(500).send({ error: "Internal server error" });
        }
        res.send(results);
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
