const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

/* =========================
   DB CONNECTION
========================= */
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    ssl: {
        rejectUnauthorized: false
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('SIGINT', async () => {
    await db.end();
    process.exit();
});

/* =========================
   UTILS
========================= */
const getLastStudentID = async () => {
    const [result] = await db.query('SELECT MAX(id) AS lastID FROM student');
    return result[0].lastID || 0;
};

const getLastTeacherID = async () => {
    const [result] = await db.query('SELECT MAX(id) AS lastID FROM teacher');
    return result[0].lastID || 0;
};

/* =========================
   API ROUTER (/api)
========================= */
const apiRouter = express.Router();

/* ---- students ---- */
apiRouter.get('/student', async (req, res) => {
    const [data] = await db.query('SELECT * FROM student');
    res.json(data);
});

apiRouter.post('/addstudent', async (req, res) => {
    try {
        const nextID = (await getLastStudentID()) + 1;

        const sql = `
            INSERT INTO student (id, name, roll_number, class)
            VALUES (?, ?, ?, ?)
        `;
        await db.query(sql, [
            nextID,
            req.body.name,
            req.body.rollNo,
            req.body.class
        ]);

        res.json({ message: 'Student inserted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Insert student failed' });
    }
});

apiRouter.delete('/student/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM student WHERE id = ?', [req.params.id]);

        const [rows] = await db.query('SELECT id FROM student ORDER BY id');
        await Promise.all(
            rows.map((row, i) =>
                db.query('UPDATE student SET id = ? WHERE id = ?', [i + 1, row.id])
            )
        );

        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete student failed' });
    }
});

/* ---- teachers ---- */
apiRouter.get('/teacher', async (req, res) => {
    const [data] = await db.query('SELECT * FROM teacher');
    res.json(data);
});

apiRouter.post('/addteacher', async (req, res) => {
    try {
        const nextID = (await getLastTeacherID()) + 1;

        const sql = `
            INSERT INTO teacher (id, name, subject, class)
            VALUES (?, ?, ?, ?)
        `;
        await db.query(sql, [
            nextID,
            req.body.name,
            req.body.subject,
            req.body.class
        ]);

        res.json({ message: 'Teacher inserted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Insert teacher failed' });
    }
});

apiRouter.delete('/teacher/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM teacher WHERE id = ?', [req.params.id]);

        const [rows] = await db.query('SELECT id FROM teacher ORDER BY id');
        await Promise.all(
            rows.map((row, i) =>
                db.query('UPDATE teacher SET id = ? WHERE id = ?', [i + 1, row.id])
            )
        );

        res.json({ message: 'Teacher deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete teacher failed' });
    }
});

/* =========================
   ROUTER MOUNT
========================= */
app.use('/api', apiRouter);

/* =========================
   HEALTH CHECK
========================= */
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/readyz', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.status(200).json({ status: 'ready' });
    } catch {
        res.status(503).json({ status: 'not ready' });
    }
});

/* =========================
   START SERVER
========================= */
const startServer = async () => {
    try {
        await db.query('SELECT 1');
        console.log('✅ DB connected');
        app.listen(3500, () =>
            console.log('🚀 Backend listening on 3500')
        );
    } catch (err) {
        console.error('❌ DB connection failed', err);
        process.exit(1);
    }
};

startServer();

