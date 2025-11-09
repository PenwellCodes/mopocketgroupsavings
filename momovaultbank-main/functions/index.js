// Standalone Express app for MoMo API
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

// Initialize Firebase Admin SDK
require("./config/firebase-admin");

// Collection routes
const accessToken = require("./routes/collection-routes/collectiontokengeneration");
const requestToPayRoutes = require("./routes/collection-routes/requesttopay.js");
const apiUserRoutes = require("./routes/create-apiuser-routes/apiuser.js");
const authRoutes = require("./routes/auth-routes/index.js");
const vaultRoutes = require("./routes/vault-routes/vault.js");
const withdrawRoutes = require("./routes/vault-routes/withdraw.js");
const userVaultInfoRoutes = require("./routes/api-routes/user-vault-info.js");
const adminRoutes = require("./routes/admin-routes/admin.js");

// Savings Groups routes
const savingsGroupsRoutes = require("./routes/savings-groups-routes/savings-groups.js");
const groupMembershipRoutes = require("./routes/savings-groups-routes/group-membership.js");
const groupContributionsRoutes = require("./routes/savings-groups-routes/group-contributions.js");
const withdrawSavingsRoutes = require('./routes/savings-groups-routes/withdraw-savings.js');

//Disbursement routes

// Import mobile money routes
const Token = require('./routes/momo-disburse-routes/DisburseTokenGeneration.js');
// const transfer = require('./routes/momo-disburse-routes/transfer.js');
const GetTransferStatus = require('./routes/momo-routes/GetTrannsferstatus.js');
const GetAccBalanceCurrency = require('./routes/momo-disburse-routes/GetAccBalanceCurrency.js');
const Gtetransactionhistory = require('./routes/momo-disburse-routes/GetTransactionHistory.js');

const User = require("./models/User.js"); // ✅ Add your User model

const app = express();
const MONGO_URI = process.env.MONGO_URI;

app.use(
  cors({
    origin: "http://localhost:5173", // ✅ your Vite/React frontend
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Database connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("mongodb is connected"))
  .catch((e) => console.log(e));

// Collection Routes
app.use("/momo", accessToken);
app.use("/momo", requestToPayRoutes);
app.use("/momo", apiUserRoutes);
app.use("/auth", authRoutes);
app.use("/api", vaultRoutes);
app.use("/api", withdrawRoutes);
app.use("/api", userVaultInfoRoutes);
app.use("/api/admin", adminRoutes);

// Savings Groups Routes
app.use("/api/savings-groups", savingsGroupsRoutes);
app.use("/api/savings-groups", groupMembershipRoutes);
app.use("/api/savings-groups", groupContributionsRoutes);
app.use('/api/', withdrawSavingsRoutes);

// Disbursement Routes

app.use("/momo-api", Token);
// app.use("/momo-api", transfer);
app.use("/momo-api", GetTransferStatus);

app.use("/momo-api", GetAccBalanceCurrency);
app.use("/momo-api", Gtetransactionhistory);






// ✅ NEW USER FETCH ROUTE
app.get("/api/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("userEmail userName");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Global error handler
app.use((err, req, res, next) => {
  console.log(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
});

// Start Express server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Express server listening on http://localhost:${PORT}`);
});
