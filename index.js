const express = require("express");
const cookiParser = require("cookie-parser");
const app = express();
app.use(cookiParser());


const mongoose = require("mongoose");

const morgan = require("morgan");
const bodyParser = require("body-parser");
const expressValidator = require("express-validator");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

// db
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to DB');
    });

mongoose.connection.on('error', err => {
    console.log(`DB connection error: ${err.message}`);
});

const pageRoutes = require("./routes/page");
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/post");
const userRoutes = require("./routes/user");

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(expressValidator());
app.use(cors());

app.use('/api', pageRoutes);
app.use('/api', authRoutes);
app.use('/api', postRoutes);
app.use('/api', userRoutes);

app.use(function (err, req, res, next) {
    if (err.name === "UnauthorizedError") {
        res.status(401).json({ error: "Unauthorized!" });
    } else {
        next(err);
    }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log('Start listening');
});