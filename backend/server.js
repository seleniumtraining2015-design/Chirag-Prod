// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: ["http://chiragkhimani.com", "https://chiragkhimani.com"], 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

const PORT = process.env.PORT || 5000;
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

console.log("Razorpay Key ID:", KEY_ID ? "FOUND" : "MISSING");
console.log("Razorpay Key Secret:", KEY_SECRET ? "FOUND" : "MISSING (DO NOT SHARE SECRET IN PROD!)");

if (!KEY_ID || !KEY_SECRET) {
  console.error("Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env");
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});

// Create Order
app.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    if (!amount) {
      return res.status(400).json({ error: 'amount is required' });
    }

    const options = {
      amount: Number(amount), // paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    console.log("Order created (backend):", {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
    return res.json(order);
  } catch (err) {
    console.error("Error creating order:", err);
    return res.status(500).json({ error: err.message || 'Error creating order' });
  }
});

// Validate payment
app.post('/order/validate', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    console.log("Validation request body:", req.body);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.warn("Missing fields in validation request");
      return res.status(400).json({ msg: "Missing fields" });
    }

    // recreate signature: sha256(order_id + "|" + payment_id)
    const hmac = crypto.createHmac('sha256', KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    console.log("Received signature:", razorpay_signature);
    console.log("Generated signature:", generatedSignature);

    if (generatedSignature === razorpay_signature) {
      console.log("Payment validated successfully for order:", razorpay_order_id);
      // You may save payment details to DB here
      return res.json({
        msg: "success",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    } else {
      console.warn("Payment validation FAILED for order:", razorpay_order_id);
      return res.status(400).json({ status: "failed", msg: "Transaction is not legit!" });
    }
  } catch (err) {
    console.error("Validation error:", err);
    return res.status(500).json({ msg: "Server error during validation" });
  }
});

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // 🔍 Validate input
    if (!name || !email  || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // ✅ Create transporter using your Gmail credentials
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ✅ Email content
    const mailOptions = {
      from: `"${name}" <${process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL,
      subject: `📩 New Contact from: ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <hr/>
        <p style="font-size: 12px; color: gray;">This email was sent automatically from your website's contact form.</p>
      `,
    };

    // ✅ Send email
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent:", info.messageId);
    res.status(200).json({ success: true, message: "Message sent successfully!" });

  } catch (error) {
    console.error("❌ Error sending mail:", error);
    res.status(500).json({ success: false, message: "Error sending message", error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
