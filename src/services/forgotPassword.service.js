import axios from "../util/axios.customize";

const forgotPasswordService = {
  sendOtp: (email) => {
    return axios.post("forgot-password", { email });
  },

  resetPassword: ({ otp, newPassword, tempToken }) => {
    return axios.post("reset-password", {
      otp,
      newPassword,
      tempToken,
    });
  },
};

export default forgotPasswordService;
