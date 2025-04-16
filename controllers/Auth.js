const bcrypt = require('bcrypt');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
exports.adminSignup = async (req, res) => {
  try {
    const { name, personal_number, ck_number, userid, password } = req.body;

    if (!name || !personal_number || !userid || !password) {
      return res.status(400).json({ error: 'Please fill all required fields.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `INSERT INTO admins (name, personal_number, ck_number, userid, password) VALUES (?, ?, ?, ?, ?)`;

    const [result] = await db.execute(sql, [name, personal_number, ck_number, userid, hashedPassword]);

    res.json({ message: 'Admin created successfully', adminId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin Login via personal number
exports.adminLogin = async (req, res) => {
  try {
    const { personal_number, password } = req.body;

    if (!personal_number || !password) {
      return res.status(400).json({ error: 'Please provide personal number and password.' });
    }

    // Check if admin exists
    const [rows] = await db.execute('SELECT * FROM admins WHERE personal_number = ?', [personal_number]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const admin = rows[0];

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, personal_number: admin.personal_number, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Cookie options
    const options = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),  // 1 day validity
      httpOnly: true,
      sameSite: 'lax',  // good for CSRF protection
      secure: false     // set to true if using HTTPS
    };

    // Set cookie + respond
    res.cookie('token', token, options).status(200).json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin.id,
        name: admin.name,
        personal_number: admin.personal_number,
        created_at: admin.created_at
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//Rm creation
exports.createRm = async (req, res) => {
  try {
    const { name, personal_number, ck_number, userid, password, upi_id } = req.body;

    // Validate required fields
    if (!name || !personal_number || !ck_number || !userid || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Check if personal_number or userid already exists
    const [existing] = await db.execute(
      'SELECT * FROM users WHERE personal_number = ? OR userid = ?',
      [personal_number, userid]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An RM with this personal number or userid already exists.'
      });
    }

    // Insert new RM
    const sql = `INSERT INTO users (name, personal_number, ck_number, userid, password, upi_id, role) 
                 VALUES (?, ?, ?, ?, ?, ?, 'rm')`;

    const [result] = await db.execute(sql, [
      name,
      personal_number,
      ck_number,
      userid,
      password,   // <-- storing plain text password (not recommended for production)
      upi_id
    ]);

    res.status(201).json({
      success: true,
      message: 'Relationship Manager created successfully',
      userId: result.insertId
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



//Rm login
exports.rmLogin = async (req, res) => {
  try {
    const { personal_number, password } = req.body;

    if (!personal_number || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Find RM user by personal_number
    const [rows] = await db.execute(`SELECT * FROM users WHERE personal_number = ? AND role = 'rm'`, [personal_number]);

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const rmUser = rows[0];

    // Check password (plain comparison)
    if (password !== rmUser.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: rmUser.id, personal_number: rmUser.personal_number, role: 'rm' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Cookie options
    const options = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      sameSite: 'lax',
      secure: false  // true in production
    };

    // Set cookie and send response
    res.cookie('token', token, options).status(200).json({
      success: true,
      message: 'Login successful',
      token,
      rmUser: {
        id: rmUser.id,
        name: rmUser.name,
        personal_number: rmUser.personal_number,
        upi_id: rmUser.upi_id
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// Update RM details
exports.rmUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, personal_number, ck_number, userid, password, upi_id } = req.body;

    // Check if RM exists
    const [existing] = await db.execute('SELECT * FROM users WHERE id = ? AND role = "rm"', [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RM not found.'
      });
    }

    // Update query
    const sql = `UPDATE users 
                 SET name = ?, personal_number = ?, ck_number = ?, userid = ?, password = ?, upi_id = ? 
                 WHERE id = ?`;

    await db.execute(sql, [name, personal_number, ck_number, userid, password, upi_id, id]);

    res.status(200).json({
      success: true,
      message: 'RM details updated successfully.'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};



// Delete RM by id
exports.rmDelete = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if RM exists
    const [existing] = await db.execute('SELECT * FROM users WHERE id = ? AND role = "rm"', [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RM not found.'
      });
    }

    // Delete query
    await db.execute('DELETE FROM users WHERE id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'RM deleted successfully.'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// Get all RMs
exports.getAllRms = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, name, personal_number, ck_number, userid, upi_id, created_at FROM users WHERE role = "rm"');

    res.status(200).json({
      success: true,
      totalRms: rows.length,
      rms: rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};



// Get single RM by id
exports.getSingleRm = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      'SELECT id, name, personal_number, ck_number, userid, upi_id, created_at FROM users WHERE id = ? AND role = "rm"',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RM not found.'
      });
    }

    res.status(200).json({
      success: true,
      rm: rows[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

