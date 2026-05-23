import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// Backend API URL - Render deploy করার পর এখানে URL বসাও
const apiUrl = import.meta.env.VITE_API_URL || "";
setBaseUrl(apiUrl);

createRoot(document.getElementById("root")!).render(<App />);
