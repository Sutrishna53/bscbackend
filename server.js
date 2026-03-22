import express from "express";
import cors from "cors";
import { ethers } from "ethers";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ BSC RPC
const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");

// ✅ Wallet from environment variable
if (!process.env.PRIVATE_KEY) {
  console.error("PRIVATE_KEY missing! Set it in Render ENV.");
  process.exit(1);
}
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ✅ Simple abuse protection
const sentAddresses = new Set();

// ✅ Config: minimum BNB to top-up (same as JS threshold)
const MIN_BNB_TOPUP = 0.00002;

// ✅ Health check
app.get("/", (req, res) => {
  res.send("BNB Topup API Running ✅");
});

// ✅ Topup endpoint
app.post("/topup", async (req, res) => {
  try {
    const { to } = req.body;

    // Validate address
    if (!to || !to.startsWith("0x") || to.length !== 42) {
      return res.status(400).json({ success: false, error: "Invalid address" });
    }

    // Prevent multiple requests
    if (sentAddresses.has(to)) {
      return res.json({ success: false, message: "Already received BNB" });
    }

    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    const balanceBNB = Number(ethers.formatEther(balance));

    if (balanceBNB < MIN_BNB_TOPUP) {
      return res.status(400).json({ success: false, error: "Faucet wallet BNB low" });
    }

    // Send BNB (exact same threshold as your JS: 0.00002)
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(MIN_BNB_TOPUP.toString())
    });

    await tx.wait();

    // Mark address as done
    sentAddresses.add(to);

    res.json({ success: true, hash: tx.hash, amount: MIN_BNB_TOPUP });

  } catch (err) {
    console.error("Topup error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
