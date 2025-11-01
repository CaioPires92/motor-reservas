import { app } from "./app.js";

const port = Number(process.env.PORT || 4200);
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () => {
  console.log(`Booking service running at http://${host}:${port}`);
});
