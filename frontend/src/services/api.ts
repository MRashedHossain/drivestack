import axios from "axios";

// All API calls go to our backend
// withCredentials: true is critical — it sends cookies with every request
// so our session (login state) is preserved across calls
const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
});

export default api;