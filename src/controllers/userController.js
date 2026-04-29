const { pool } = require("../config/database");

class UserController {
  /**
   * Get current user profile
   * Requires authentication
   */
  static async getCurrentUser(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      res.json({
        status: "success",
        data: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          is_active: req.user.is_active,
        },
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch user profile",
      });
    }
  }
}

module.exports = UserController;
