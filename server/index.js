const express = require('express');
const cors = require('cors');
require('dotenv').config();

const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files (resumes, etc.) as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Routes
app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/roles', require('./routes/roles'));
app.use('/students', require('./routes/students'));
app.use('/departments', require('./routes/departments'));
app.use('/faculty', require('./routes/faculty'));
app.use('/companies', require('./routes/companies'));
app.use('/jobs', require('./routes/jobs'));
app.use('/applications', require('./routes/applications'));
app.use('/stats', require('./routes/stats'));
app.use('/notifications', require('./routes/notifications'));
app.use('/tpc-management', require('./routes/tpcManagement'));
app.use('/tpf-management', require('./routes/tpfManagement'));
app.use('/student-management', require('./routes/studentManagement'));
app.use('/admin-settings', require('./routes/adminSettings'));


app.get('/', (req, res) => {
    res.send('Design Engineering Backend API is Running');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
