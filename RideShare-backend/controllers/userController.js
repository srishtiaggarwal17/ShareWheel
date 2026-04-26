const Ride = require("../models/Ride");
const User = require("../models/User");

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let totalRides = 0;
    let earnings = 0;

    if (user.role === "rider") {
      // Driver: count rides as driver, show earnings
      const completedAsDriver = await Ride.find({
        driver: userId,
        status: "completed",
      });
      totalRides = completedAsDriver.length;
      earnings = user.totalEarnings || 0;
    } else {
      // Passenger: count rides as confirmed passenger, earnings always 0
      const completedAsPassenger = await Ride.find({
        status: "completed",
        passengers: {
          $elemMatch: { user: userId, status: "confirmed" },
        },
      });
      totalRides = completedAsPassenger.length;
      earnings = 0;
    }

    res.json({
      totalRides,
      earnings,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch user stats", error: error.message });
  }
};

// DEBUG/ADMIN: Update all completed rides for a driver to have a confirmed passenger
exports.debugSetConfirmedPassenger = async (req, res) => {
  try {
    const { driverId, passengerId } = req.body;
    if (!driverId || !passengerId) {
      return res
        .status(400)
        .json({ message: "driverId and passengerId are required" });
    }
    const result = await Ride.updateMany(
      { driver: driverId, status: "completed" },
      {
        $set: {
          "passengers.0": {
            user: passengerId,
            seats: 1,
            status: "confirmed",
            paymentStatus: "completed",
          },
        },
      }
    );
    res.json({ message: "Updated completed rides for driver", result });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update rides", error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch user", error: error.message });
  }
};
