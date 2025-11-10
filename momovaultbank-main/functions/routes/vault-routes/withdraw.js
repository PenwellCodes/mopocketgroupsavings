const express = require("express");
const router = express.Router();
const Vault = require("../../models/Vault");
const LockedDeposit = require("../../models/LockedDeposit");
const Transaction = require("../../models/Transaction");
const momoTokenManager = require("../../middlewares/TokenManager");
const { momoDisbursementBaseUrl } = require("../../middlewares/momoConfig");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const authenticateMiddleware = require("../../middlewares/auth-middleware");
const { validateAndFormatPhone } = require("../../utils/phoneValidator");

// Ensure disbursement token is available
async function ensureDisbursementToken() {
  let token = momoTokenManager.getMomoDisbursementToken();
  
  if (!token) {
    const apiUserId = process.env.DISBURSEMENT_API_USER;
    const apiKey = process.env.DISBURSEMENT_API_KEY;
    const credentials = `${apiUserId}:${apiKey}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    try {
      const response = await axios.post(`${momoDisbursementBaseUrl}/token/`, null, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Ocp-Apim-Subscription-Key': process.env.DISBURSEMENT_SUBSCRIPTION_KEY,
          'Authorization': `Basic ${encodedCredentials}`,
        },
      });
      token = response.data.access_token;
      momoTokenManager.setMomoDisbursementToken(token);
    } catch (error) {
      console.error("Disbursement Token Generation Error:", error.response?.data || error.message);
      throw new Error('Failed to generate disbursement token');
    }
  }
  
  return token;
}

// 💸 Withdraw from specific locked deposits
router.post("/withdraw", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== WITHDRAWAL REQUEST START ===");
    console.log("Request body:", req.body);
    console.log("User:", req.user);
    
    const userId = req.user._id;
    const { phoneNumber, depositIds } = req.body; // Changed to accept array of deposit IDs

    // Validate input
    if (!phoneNumber || !depositIds || !Array.isArray(depositIds) || depositIds.length === 0) {
      console.log("Validation failed - missing required fields");
      return res.status(400).json({ 
        success: false, 
        message: "Valid phone number and array of deposit IDs are required" 
      });
    }

    console.log("Input validation passed");
    
    // Validate and format phone number
    const phoneValidation = validateAndFormatPhone(phoneNumber);
    if (!phoneValidation.isValid) {
      console.log("Phone validation failed:", phoneValidation.error);
      return res.status(400).json({
        success: false,
        message: `Invalid phone number: ${phoneValidation.error}`
      });
    }
    const formattedPhone = phoneValidation.formatted;
    console.log("Phone formatted to:", formattedPhone);

    // Get the specific locked deposits
    console.log("Fetching locked deposits for IDs:", depositIds);
    const lockedDeposits = await LockedDeposit.find({ 
      _id: { $in: depositIds },
      userId, 
      status: "locked" 
    });

    console.log("Found locked deposits:", lockedDeposits.length);
    
    if (lockedDeposits.length === 0) {
      console.log("No valid locked deposits found");
      return res.status(400).json({ 
        success: false, 
        message: "No valid locked deposits found for withdrawal" 
      });
    }

    if (lockedDeposits.length !== depositIds.length) {
      console.log("Deposit count mismatch - requested:", depositIds.length, "found:", lockedDeposits.length);
      return res.status(400).json({ 
        success: false, 
        message: "Some deposit IDs are invalid or already withdrawn" 
      });
    }

    // Verify the phone number matches the one used for each deposit
    for (const deposit of lockedDeposits) {
      if (!deposit.phoneNumber) {
        return res.status(400).json({
          success: false,
          message: `Deposit ${deposit._id} is missing an associated phone number; cannot verify ownership`
        });
      }
      if (deposit.phoneNumber !== formattedPhone) {
        return res.status(403).json({
          success: false,
          message: `Phone number does not match the depositor's number for deposit `
        });
      }
    }

    const now = new Date();
    const withdrawalDetails = [];
    let totalWithdrawalAmount = 0;
    let totalFees = 0;
    let totalPenalties = 0;

    console.log("Processing deposits...");
    
    // Process each deposit individually
    for (const deposit of lockedDeposits) {
      const depositTime = new Date(deposit.createdAt);
      const hoursSinceDeposit = (now - depositTime) / (1000 * 60 * 60);
      const lockPeriodInHours = deposit.lockPeriodInDays * 24;
      const isEarlyWithdrawal = hoursSinceDeposit < lockPeriodInHours;
      
      let penalty = 0;
      const flatFee = 5; // E5 flat fee per deposit
      
      // Calculate flat 10% penalty for early withdrawal
      if (isEarlyWithdrawal) {
        penalty = deposit.amount * 0.10; // Flat 10% penalty for all lock periods
      }

      const netAmount = deposit.amount - penalty - flatFee;
      
      console.log(`Deposit ${deposit._id}: amount=${deposit.amount}, penalty=${penalty}, fee=${flatFee}, net=${netAmount}`);
      
      if (netAmount <= 0) {
        console.log(`Insufficient funds for deposit ${deposit._id}`);
        return res.status(400).json({ 
          success: false, 
          message: `Deposit ${deposit._id} has insufficient funds after fees and penalties` 
        });
      }

      withdrawalDetails.push({
        deposit,
        penalty,
        flatFee,
        netAmount,
        isEarly: isEarlyWithdrawal
      });

      totalWithdrawalAmount += netAmount;
      totalFees += flatFee;
      totalPenalties += penalty;
    }

    console.log("Total withdrawal amount:", totalWithdrawalAmount);
    console.log("Generating disbursement token...");
    
    // Generate disbursement token
    const disbursementToken = await ensureDisbursementToken();
    console.log("Disbursement token obtained");

    // Prepare disbursement request for the total net amount
    const referenceId = uuidv4();
    const disbursementBody = {
      amount: String(totalWithdrawalAmount),
      currency: 'EUR',
      externalId: uuidv4().replace(/-/g, '').slice(0, 24),
      payee: {
        partyIdType: "MSISDN",
        partyId: formattedPhone,
      },
      payerMessage: "Withdrawal from MoMoVault",
      payeeNote: "Individual deposit withdrawals",
    };

    console.log("Disbursement request:", disbursementBody);
    
    // Execute disbursement
    const disbursementResponse = await axios.post(
      `${momoDisbursementBaseUrl}/v1_0/transfer`,
      disbursementBody,
      {
        headers: {
          'Authorization': `Bearer ${disbursementToken}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': process.env.TARGET_ENVIRONMENT,
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': process.env.DISBURSEMENT_SUBSCRIPTION_KEY,
        },
        validateStatus: () => true
      }
    );

    console.log("Disbursement response status:", disbursementResponse.status);
    console.log("Disbursement response data:", disbursementResponse.data);
    
    if (disbursementResponse.status !== 202) {
      console.log("Disbursement failed with status:", disbursementResponse.status);
      return res.status(disbursementResponse.status).json({
        success: false,
        message: 'Disbursement failed',
        details: disbursementResponse.data
      });
    }

    console.log("Disbursement successful, updating deposits and creating transactions...");
    
    // Update each deposit and create individual transactions
    const processedDeposits = [];
    
    for (const detail of withdrawalDetails) {
      const { deposit, penalty, flatFee, netAmount, isEarly } = detail;
      
      // Update deposit status
      deposit.status = isEarly ? "withdrawn-early" : "unlocked";
      deposit.penaltyApplied = penalty > 0;
      await deposit.save();

      // Record individual withdrawal transaction
      await Transaction.create({
        userId,
        type: "withdrawal",
        amount: netAmount,
        penaltyFee: penalty,
        momoTransactionId: referenceId,
        relatedLockedDepositIndex: deposit._id, // Store deposit ID instead of index
        createdAt: new Date()
      });

      // Record individual flat fee transaction
      await Transaction.create({
        userId,
        type: "penalty",
        amount: flatFee,
        penaltyFee: flatFee,
        momoTransactionId: referenceId,
        relatedLockedDepositIndex: deposit._id,
        createdAt: new Date()
      });

      // Record individual penalty transaction if any
      if (penalty > 0) {
        await Transaction.create({
          userId,
          type: "penalty",
          amount: penalty,
          penaltyFee: penalty,
          momoTransactionId: referenceId,
          relatedLockedDepositIndex: deposit._id,
          createdAt: new Date()
        });
      }

      processedDeposits.push({
        depositId: deposit._id,
        originalAmount: deposit.amount,
        penalty,
        flatFee,
        netAmount,
        isEarlyWithdrawal: isEarly,
        lockPeriodInDays: deposit.lockPeriodInDays
      });
    }

    // Update vault balance (subtract the total original amounts)
    const vault = await Vault.findOne({ userId });
    if (vault) {
      const totalOriginalAmount = lockedDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);
      vault.balance -= totalOriginalAmount;
      await vault.save();
      console.log("Vault balance updated");
    }

    console.log("=== WITHDRAWAL SUCCESS ===");
    
    res.status(200).json({
      success: true,
      message: "Individual deposit withdrawals processed successfully",
      data: {
        totalWithdrawn: totalWithdrawalAmount,
        totalFees: totalFees,
        totalPenalties: totalPenalties,
        referenceId: referenceId,
        processedDeposits: processedDeposits,
        depositsProcessed: processedDeposits.length
      }
    });

  } catch (error) {
    console.error("Withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Withdrawal processing failed",
      error: error.message
    });
  }
});

// 📋 Get withdrawable deposits for user
router.get("/withdrawable-deposits", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const lockedDeposits = await LockedDeposit.find({ 
      userId, 
      status: "locked" 
    }).sort({ createdAt: 1 });

    const now = new Date();
    const withdrawableDeposits = lockedDeposits.map(deposit => {
      const depositTime = new Date(deposit.createdAt);
      const hoursSinceDeposit = (now - depositTime) / (1000 * 60 * 60);
      const lockPeriodInHours = deposit.lockPeriodInDays * 24;
      
      const canWithdraw = true; // No 24-hour restriction
      const isEarlyWithdrawal = hoursSinceDeposit < lockPeriodInHours;
      const hoursUntilMaturity = Math.max(0, lockPeriodInHours - hoursSinceDeposit);
      
      let penalty = 0;
      if (isEarlyWithdrawal) {
        penalty = deposit.amount * 0.10; // Flat 10% penalty for all lock periods
      }

      const flatFee = 5;
      const netAmount = Math.max(0, deposit.amount - penalty - flatFee);

      return {
        depositId: deposit._id,
        amount: deposit.amount,
        lockPeriodInDays: deposit.lockPeriodInDays,
        depositDate: deposit.createdAt,
        canWithdraw,
        isEarlyWithdrawal,
        penalty,
        flatFee,
        netAmount,
        hoursUntilMaturity: Math.ceil(hoursUntilMaturity)
      };
    });

    res.status(200).json({
      success: true,
      data: withdrawableDeposits
    });

  } catch (error) {
    console.error("Withdrawable deposits error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch withdrawable deposits",
      error: error.message
    });
  }
});

module.exports = router;