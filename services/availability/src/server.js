import { app } from "./app.js";

const port = Number(process.env.PORT || 4100);
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () => {
  console.log(`Availability service running at http://${host}:${port}`);
});
